from django.utils import timezone


def today():
    """Today's calendar day in America/Panama; tests replace this clock."""
    return timezone.localdate()
