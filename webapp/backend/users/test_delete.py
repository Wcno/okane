from unittest import mock

import httpx
from django.test import Client

from gateway.tests import StubApiServiceMixin
from gateway.upstream import api_service
from users.models import User
from users.tests import PASSWORD, AuthTestCase


class DeleteUserTestCase(StubApiServiceMixin, AuthTestCase):
    def setUp(self):
        super().setUp()
        self.api_service.status = 204
        self.api_service.body = b""
        self.register()
        self.user = User.objects.get(email="ana@example.com")

    def delete_account(self, password=PASSWORD, client=None):
        return self.send_delete({"password": password}, client)

    def send_delete(self, data, client=None, token=None):
        client = client or self.client
        return client.delete(
            "/users/me",
            data=data,
            content_type="application/json",
            headers={"X-CSRFToken": token or self.csrf_token(client)},
        )

    def signed_in_client(self):
        client = Client(enforce_csrf_checks=True)
        self.login(client=client)
        return client

    def signed_in_user(self, client):
        return client.get("/auth/session").json()["user"]


class DeleteUserTests(DeleteUserTestCase):
    def test_deleting_asks_api_service_first_and_then_removes_the_user(self):
        user_present_when_asked = []
        ask_api_service = api_service.delete

        def ask_while_user_exists(*args, **kwargs):
            user_present_when_asked.append(User.objects.filter(pk=self.user.pk).exists())
            return ask_api_service(*args, **kwargs)

        with mock.patch("gateway.erasure.api_service.delete", side_effect=ask_while_user_exists):
            response = self.delete_account()

        self.assertEqual(response.status_code, 204)
        self.assertEqual(user_present_when_asked, [True])
        asked = self.api_service.received
        self.assertEqual([(call.method, call.path) for call in asked], [("DELETE", "/internal/users/me")])
        self.assertEqual(asked[0].headers["x-okane-service-key"], "expected-key")
        self.assertEqual(asked[0].headers["x-okane-user-id"], str(self.user.pk))
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_the_session_that_deleted_the_user_ends(self):
        self.delete_account()

        self.assertIsNone(self.signed_in_user(self.client))

    def test_every_other_session_of_the_user_ends(self):
        other = self.signed_in_client()
        self.assertIsNotNone(self.signed_in_user(other))

        self.delete_account()

        self.assertIsNone(self.signed_in_user(other))

    def test_the_email_can_register_again_with_a_new_empty_user(self):
        self.delete_account()

        registered = self.register(client=Client(enforce_csrf_checks=True))

        self.assertEqual(registered.status_code, 201)
        self.assertNotEqual(registered.json()["user"]["id"], self.user.pk)

    def test_the_old_credentials_no_longer_sign_in(self):
        self.delete_account()

        response = self.login(client=Client(enforce_csrf_checks=True))

        self.assertEqual(response.status_code, 400)

    def test_other_users_are_untouched(self):
        other = User.objects.create_user("luis@example.com", PASSWORD)

        self.delete_account()

        self.assertTrue(User.objects.filter(pk=other.pk).exists())
        self.assertEqual(self.api_service.received[0].headers["x-okane-user-id"], str(self.user.pk))


class DeleteUserValidationTests(DeleteUserTestCase):
    def test_requires_a_session(self):
        response = self.delete_account(client=Client(enforce_csrf_checks=True))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api_service.received, [])

    def test_a_wrong_password_deletes_nothing_and_never_calls_api_service(self):
        response = self.delete_account(password="not-the-password")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["errors"]["password"],
            ["La contraseña no coincide. Revísala e inténtalo de nuevo."],
        )
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
        self.assertEqual(self.api_service.received, [])
        self.assertIsNotNone(self.signed_in_user(self.client))

    def test_an_empty_or_unreadable_password_is_rejected(self):
        for data in ({}, {"password": ""}, {"password": 7}, [1]):
            with self.subTest(data=data):
                response = self.send_delete(data)

                self.assertEqual(response.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
        self.assertEqual(self.api_service.received, [])

    def test_a_request_without_the_csrf_token_is_rejected(self):
        response = self.send_delete({"password": PASSWORD}, token="forged")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_other_methods_are_not_accepted(self):
        response = self.post("/users/me", {"password": PASSWORD})

        self.assertEqual(response.status_code, 405)


class DeleteUserWhenApiServiceFailsTests(DeleteUserTestCase):
    def assert_user_kept_and_still_signed_in(self, response):
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json(), {"status": "unavailable", "service": "api-service"})
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
        self.assertIsNotNone(self.signed_in_user(self.client))
        self.assertIsNotNone(self.signed_in_user(self.signed_in_client()))

    def test_an_unreachable_api_service_keeps_the_user(self):
        self.api_service.stop()

        self.assert_user_kept_and_still_signed_in(self.delete_account())

    def test_an_api_service_error_keeps_the_user(self):
        self.api_service.status = 500

        self.assert_user_kept_and_still_signed_in(self.delete_account())

    def test_an_answer_that_is_not_a_confirmation_keeps_the_user(self):
        self.api_service.status = 200

        self.assert_user_kept_and_still_signed_in(self.delete_account())

    def test_retrying_after_the_failure_completes_the_deletion(self):
        self.api_service.status = 503
        self.assertEqual(self.delete_account().status_code, 502)
        self.api_service.status = 204

        retried = self.delete_account()

        self.assertEqual(retried.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_a_lost_answer_is_settled_by_asking_again_before_declaring_success(self):
        answers = [httpx.ReadTimeout("no answer"), httpx.Response(204)]

        with mock.patch("gateway.erasure.api_service.delete", side_effect=answers) as delete:
            response = self.delete_account()

        self.assertEqual(response.status_code, 204)
        self.assertEqual(delete.call_count, 2)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_a_lost_answer_after_api_service_erased_the_data_is_settled_by_the_repeat(self):
        ask_api_service = api_service.delete
        attempts = []

        def erase_and_lose_first_answer(*args, **kwargs):
            attempts.append(None)
            answer = ask_api_service(*args, **kwargs)
            if len(attempts) == 1:
                raise httpx.ReadTimeout("answer lost after the erasure")
            return answer

        with mock.patch("gateway.erasure.api_service.delete", side_effect=erase_and_lose_first_answer):
            response = self.delete_account()

        self.assertEqual(response.status_code, 204)
        self.assertEqual(len(self.api_service.received), 2)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_two_lost_answers_leave_the_result_uncertain_and_keep_the_user(self):
        answers = [httpx.ReadTimeout("no answer"), httpx.ReadTimeout("no answer")]

        with mock.patch("gateway.erasure.api_service.delete", side_effect=answers):
            response = self.delete_account()

        self.assert_user_kept_and_still_signed_in(response)


class DeleteUserRepeatsOnceTests(DeleteUserTestCase):
    def test_an_error_answer_is_asked_once_more_before_giving_up(self):
        for status in (500, 503):
            with self.subTest(status=status):
                self.api_service.received.clear()
                self.api_service.status = status

                response = self.delete_account()

                self.assertEqual(response.status_code, 502)
                self.assertEqual(len(self.api_service.received), 2)
                self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_a_transport_error_is_asked_once_more_before_giving_up(self):
        with mock.patch(
            "gateway.erasure.api_service.delete", side_effect=httpx.ConnectError("refused")
        ) as delete:
            response = self.delete_account()

        self.assertEqual(response.status_code, 502)
        self.assertEqual(delete.call_count, 2)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_a_confirmed_answer_is_asked_only_once(self):
        response = self.delete_account()

        self.assertEqual(response.status_code, 204)
        self.assertEqual(len(self.api_service.received), 1)


class InternalRoutesAreNotPublicTests(DeleteUserTestCase):
    def test_the_internal_erasure_route_is_not_reachable_through_webapp(self):
        for method in ("get", "delete", "post"):
            with self.subTest(method=method):
                response = getattr(self.client, method)("/internal/users/me")

                self.assertEqual(response.status_code, 404)
                self.assertNotIn(b'id="root"', response.content)
        self.assertEqual(self.api_service.received, [])
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
