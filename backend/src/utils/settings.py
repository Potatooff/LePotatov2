import json
import os


def load_default_settings():
    """
    Load settings from default.json configuration file.
    Returns a dictionary containing the settings.
    """
    try:
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            'config',
            'samplers_profiles',
            'default.json'
        )
        
        with open(config_path, 'r') as file:
            settings = json.load(file)
        return settings
    except FileNotFoundError:
        raise FileNotFoundError("default.json configuration file not found")
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format in default.json")


from dotenv import load_dotenv
load_dotenv()
qdrant_cloud_key = os.getenv("QDRANT_CLOUD_KEY")

# Example usage:
#if __name__ == "__main__":
#    try:
#        default_settings = load_default_settings()
#        print(default_settings)
#    except Exception as e:
#        print(f"Error loading settings: {e}")
