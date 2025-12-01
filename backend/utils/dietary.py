import re

NON_VEG = [
    "chicken", "egg", "eggs", "mutton", "lamb", "fish", "prawn", "shrimp",
    "crab", "beef", "pork", "bacon", "ham", "sausage", "pepperoni"
]

DAIRY = [
    "milk", "butter", "cheese", "paneer", "ghee", "cream", "yogurt", "curd", "mayo"
]

GLUTEN = [
    "wheat", "maida", "atta", "bread", "pasta", "pizza", "roti", "naan", "chapati"
]

NUTS = [
    "almond", "cashew", "pista", "walnut", "peanut", "hazelnut"
]

def detect_dietary_info(name, description):
    text = f"{name} {description}".lower()

    has_non_veg = any(word in text for word in NON_VEG)
    has_dairy = any(word in text for word in DAIRY)
    has_gluten = any(word in text for word in GLUTEN)
    has_nuts = any(word in text for word in NUTS)

    is_vegetarian = not has_non_veg
    is_vegan = is_vegetarian and not has_dairy
    is_gluten_free = not has_gluten
    is_nut_free = not has_nuts

    return {
        "is_vegetarian": is_vegetarian,
        "is_vegan": is_vegan,
        "is_gluten_free": is_gluten_free,
        "is_nut_free": is_nut_free
    }
