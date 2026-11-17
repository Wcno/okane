MONTHS = ("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")


def spanish_day(day):
    """2026-11-01 as "1 nov 2026", the way the app writes dates."""
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"
