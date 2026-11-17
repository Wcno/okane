"""The fixed Category catalog of the system (docs/matrices.md).

Until Users can create their own Categories, every Expense refers to one of
these. The ids are part of the API: they are stable, and the table that will
hold Categories later is seeded with the same ids.
"""

from enum import IntEnum


class Category(IntEnum):
    HOUSING = 1  # Vivienda
    FOOD = 2  # Alimentación
    TRANSPORT = 3  # Transporte
    UTILITIES = 4  # Servicios
    HEALTH = 5  # Salud
    ENTERTAINMENT = 6  # Entretenimiento
    EDUCATION = 7  # Educación
    OTHER = 8  # Otros


CATEGORY_IDS = [category.value for category in Category]
