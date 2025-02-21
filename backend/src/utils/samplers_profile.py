import json
from pathlib import Path


class SamplerProfileManager:
    def __init__(self, profiles_dir):
        """
        Initialize the profile manager with a directory path for profiles.
        
        Args:
            profiles_dir (str): Path to the directory containing sampler profiles
        """
        self.profiles_dir = Path(profiles_dir)
        self._ensure_profiles_directory()

    def _ensure_profiles_directory(self):
        """Ensures the profiles directory exists."""
        try:
            self.profiles_dir.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            print(f"Permission denied: Cannot create directory {self.profiles_dir}")
            raise

    def _get_profile_path(self, profile_name):
        """Gets the full path for a profile."""
        return self.profiles_dir / f"{profile_name}.json"

    def create_profile(self, profile_name, profile_data):
        """
        Creates a new sampler profile.
        
        Args:
            profile_name (str): Name of the profile
            profile_data (dict): Profile configuration data
        """
        try:
            profile_path = self._get_profile_path(profile_name)
            profile_data['profile_name'] = profile_name
            
            # Ensure profile has required structure
            if 'samplers' not in profile_data:
                profile_data['samplers'] = {}
                for key in ['temperature', 'top_p', 'top_k', 'min_p']:
                    if key in profile_data:
                        profile_data['samplers'][key] = profile_data.pop(key)

            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(profile_data, f, indent=4)
            return True
        except PermissionError:
            print(f"Permission denied: Cannot create profile {profile_name}")
            return False
        except Exception as e:
            print(f"Error creating profile: {e}")
            return False

    def read_profile(self, profile_name):
        """
        Reads an existing sampler profile.
        
        Args:
            profile_name (str): Name of the profile to read
        """
        try:
            profile_path = self._get_profile_path(profile_name)
            with open(profile_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Profile '{profile_name}' not found.")
            return None
        except Exception as e:
            print(f"Error reading profile: {e}")
            return None

    def list_profiles(self):
        """Returns a list of available profile names."""
        try:
            return [f.stem for f in self.profiles_dir.glob("*.json")]
        except Exception as e:
            print(f"Error listing profiles: {e}")
            return []

    def update_profile(self, profile_name, updates):
        """
        Updates an existing sampler profile.
        
        Args:
            profile_name (str): Name of the profile to update
            updates (dict): New values to update in the profile
        """
        try:
            profile_data = self.read_profile(profile_name)
            if profile_data:
                profile_data.update(updates)
                profile_data['profile_name'] = profile_name  # Ensure name stays correct
                return self.create_profile(profile_name, profile_data)
            return False
        except Exception as e:
            print(f"Error updating profile: {e}")
            return False

    def delete_profile(self, profile_name):
        """
        Deletes an existing sampler profile.
        
        Args:
            profile_name (str): Name of the profile to delete
        """
        try:
            profile_path = self._get_profile_path(profile_name)
            if profile_path.exists():
                profile_path.unlink()
                return True
            print(f"Profile '{profile_name}' not found.")
            return False
        except PermissionError:
            print(f"Permission denied: Cannot delete profile {profile_name}")
            return False
        except Exception as e:
            print(f"Error deleting profile: {e}")
            return False
        
        
# Example usage
if __name__ == '__main__':
    # Use relative path from the script location
    config_folder_path = Path(__file__).parent.parent.parent.parent / 'config' / 'samplers_profiles'
    manager = SamplerProfileManager(config_folder_path)

    # Create default profile if it doesn't exist
    default_profile = {
        "profile_name": "profile_1",
        "system_prompt": "...",
        "temperature": 0.85,
        "top_p": 0.75,
        "top_k": 0,
        "min_p": 0.05
    }

    # Example usage
    print("Creating default profile...")
    manager.create_profile("potato", default_profile)

    print("\nAvailable profiles:")
    profiles = manager.list_profiles()
    print(profiles)


    # Read and update profile
    profile = manager.read_profile("default")
    current_profile_samplers = profile['samplers']
