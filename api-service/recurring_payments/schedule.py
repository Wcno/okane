import calendar
import datetime


def month_start(day):
    return day.replace(day=1)


def next_month(month):
    return (month.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)


def due_date(month, day_of_month):
    """The rule's day in `month`; a day the month lacks becomes its last day."""
    return month.replace(day=min(day_of_month, calendar.monthrange(month.year, month.month)[1]))


def month_end(day):
    return day.replace(day=calendar.monthrange(day.year, day.month)[1])
