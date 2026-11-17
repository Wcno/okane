from rest_framework import serializers

from accounts.serializers import messages
from categories.models import NAME_MAX_LENGTH, Category
from categories.rules import owned_by

NAME_INVALID = "Escribe el nombre de la Categoría."
NAME_TOO_LONG = f"El nombre puede tener hasta {NAME_MAX_LENGTH} caracteres."
NAME_TAKEN = "Ya tienes una Categoría con ese nombre. Elige otro."


class StrictTextField(serializers.CharField):
    """Text only: a number is not coerced into a name."""

    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        return super().to_internal_value(data)


class CategorySerializer(serializers.Serializer):
    """Validates a Category's name; `context["user_id"]` is the User webapp authenticated."""

    name = StrictTextField(
        max_length=NAME_MAX_LENGTH,
        error_messages={
            **messages(NAME_INVALID, "required", "null", "invalid", "blank"),
            "max_length": NAME_TOO_LONG,
        },
    )

    def validate_name(self, value):
        name = " ".join(value.split())
        if not name:
            raise serializers.ValidationError(NAME_INVALID)
        taken = owned_by(self.context["user_id"]).filter(
            name__iexact=name, archived_at__isnull=True
        )
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError(NAME_TAKEN)
        return name

    def create(self, validated_data):
        return Category.objects.create(user_id=self.context["user_id"], **validated_data)

    def update(self, instance, validated_data):
        instance.name = validated_data["name"]
        instance.save()
        return instance


def represent(category):
    """`category` comes from `rules.with_records`, so `has_records` is on it."""
    return {
        "id": category.id,
        "name": category.name,
        "key": category.key,
        "has_records": category.has_records,
        "archived_at": category.archived_at.isoformat() if category.archived_at else None,
    }
