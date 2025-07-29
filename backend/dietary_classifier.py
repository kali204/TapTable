# dietary_classifier.py
import re
from typing import Dict, List

class DietaryClassifier:
    def __init__(self):
        # Non-vegetarian keywords (case-insensitive)
        self.non_veg_keywords = {
            'chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn', 'shrimp',
            'crab', 'lobster', 'salmon', 'tuna', 'meat', 'ham', 'bacon', 'sausage',
            'turkey', 'duck', 'goat', 'egg', 'eggs', 'keema', 'tikka', 'tandoori chicken',
            'butter chicken', 'chicken curry', 'fish curry', 'mutton curry',
            'biryani chicken', 'chicken biryani', 'mutton biryani', 'fish fry',
            'chicken fry', 'mutton fry', 'egg curry', 'omelette', 'scrambled egg'
        }
        
        # Vegan-friendly keywords
        self.vegan_keywords = {
            'salad', 'fruit', 'vegetable', 'quinoa', 'tofu', 'hummus', 'falafel',
            'avocado', 'coconut', 'almond', 'oat', 'soy', 'vegan', 'plant-based',
            'dal', 'lentil', 'chickpea', 'black bean', 'kidney bean', 'green bean',
            'rice', 'roti', 'chapati', 'vegetable curry', 'dal tadka', 'dal fry'
        }
        
        # Non-vegan vegetarian items (contains dairy)
        self.dairy_keywords = {
            'cheese', 'butter', 'cream', 'milk', 'yogurt', 'curd', 'ghee', 'paneer',
            'mozzarella', 'cheddar', 'cottage cheese', 'ice cream', 'lassi',
            'milkshake', 'cappuccino', 'latte', 'hot chocolate', 'masala chai',
            'tea', 'coffee with milk', 'kulfi', 'rabdi', 'kheer'
        }
        
        # Gluten-containing keywords
        self.gluten_keywords = {
            'bread', 'wheat', 'pasta', 'noodles', 'pizza', 'burger', 'sandwich',
            'roti', 'naan', 'chapati', 'paratha', 'kulcha', 'biscuit', 'cake',
            'cookie', 'flour', 'atta', 'maida', 'bhatura', 'puri', 'dosa',
            'uttapam', 'idli', 'vada', 'samosa', 'kachori'
        }
        
        # Nut-containing keywords
        self.nut_keywords = {
            'almond', 'cashew', 'walnut', 'peanut', 'pistachio', 'hazelnut',
            'pecan', 'brazil nut', 'macadamia', 'pine nut', 'kaju', 'badam',
            'nut', 'nuts', 'pista', 'groundnut'
        }
        
        # Special Indian vegetarian dishes that should definitely be marked as vegetarian
        self.definitely_veg_keywords = {
            'paneer', 'dal', 'sabzi', 'aloo', 'gobi', 'palak', 'bhindi',
            'baingan', 'karela', 'lauki', 'tori', 'methi', 'rajma', 'chole',
            'kadhi', 'sambar', 'rasam', 'vegetable', 'veg'
        }

    def classify_item(self, name: str, description: str = "") -> Dict[str, bool]:
        """
        Classify a menu item based on its name and description
        """
        # Combine name and description for analysis
        text = f"{name} {description}".lower()
        
        # Remove extra spaces and special characters
        text = re.sub(r'[^\w\s]', ' ', text)
        text = ' '.join(text.split())
        
        # Initialize all as True and then mark False based on detection
        is_vegetarian = True
        is_vegan = True
        is_gluten_free = True
        is_nut_free = True
        
        # Check for non-vegetarian items first
        if any(keyword in text for keyword in self.non_veg_keywords):
            is_vegetarian = False
            is_vegan = False
        else:
            # If not non-veg, check if it's definitely vegetarian
            if any(keyword in text for keyword in self.definitely_veg_keywords):
                is_vegetarian = True
        
        # Check for dairy (makes it non-vegan but still vegetarian if no meat)
        if any(keyword in text for keyword in self.dairy_keywords):
            is_vegan = False
        
        # Check for gluten
        if any(keyword in text for keyword in self.gluten_keywords):
            is_gluten_free = False
        
        # Check for nuts
        if any(keyword in text for keyword in self.nut_keywords):
            is_nut_free = False
        
        # Special handling for common beverages
        if any(beverage in text for beverage in ['coffee', 'tea', 'juice', 'water', 'soda']):
            # Most beverages are vegetarian, check for dairy specifically
            if not any(dairy in text for dairy in ['milk', 'cream', 'latte', 'cappuccino']):
                is_vegan = True  # Plain coffee, tea, juice are usually vegan
            is_gluten_free = True  # Most beverages are gluten-free
            if 'nut' not in text and 'almond' not in text:
                is_nut_free = True
        
        return {
            'is_vegetarian': is_vegetarian,
            'is_vegan': is_vegan,
            'is_gluten_free': is_gluten_free,
            'is_nut_free': is_nut_free
        }

# Initialize the classifier
dietary_classifier = DietaryClassifier()
