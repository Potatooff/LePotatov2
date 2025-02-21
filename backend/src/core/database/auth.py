# NOT IMPLEMENTED YET

from src.core.database.constants import *
from appwrite.services.account import Account


class AppwriteAuth:
    def __init__(self, endpoint: str, project_id: str, project_api_key: str):
        self.client = Client()
        self.client.set_endpoint(endpoint).set_project(project_id).set_key(project_api_key)
        self.account = Account(self.client)
    
    def signup(self, email: str, password: str, username: str):
        """
        Create a new user account using email, password, and username.
        """
        try:
            # 'unique()' automatically generates a unique user ID.
            result = self.account.create(user_id='unique()', email=email, password=password, name=username)
            print("Signup successful:", result)
            return result
        except Exception as e:
            print("Signup failed:", e)
            return {"error": str(e)}
    
        
    
    def login(self, email: str, password: str):
        """
        Log in an existing user with email and password.
        
        Args:
            email (str): User's email address
            password (str): User's password
            
        Returns:
            Dict: Response from Appwrite or error message
        """
        try:
            result = self.account.create_email_password_session(
                email=email,
                password=password
            )
            return {"success": True, "session": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
        
    def get_current_user(self):
        """
        Get the currently logged-in user's details.
        
        Returns:
            Optional[Dict]: User details if logged in, None otherwise
        """
        try:
            return self.account.get()
        except Exception:
            return None

# Example usage:
if __name__ == "__main__":
    
    auth = AppwriteAuth(
        "https://cloud.appwrite.io/v1", 
        "67ae6af0000e9604ffc5",
        "standard_246fd8a56dd27fedd6d7d37763d4c132f880df8e063d18cd30c6e908510273c088507dba42cf1d902d8d690910e37e7dfddd844478f39c4a4318d625d2d5e35fed78fb13d512606ec70d73ad40ddfaae1ad8178d9621fcfd3bdc2059bdd0d380fa743feddb277924bde714da267fb1a4c727eaa876d099697414109f8e17d677"
    )
    
    # Signup example
    signup_response = auth.signup('potato@example.com', 'very_potatoe', 'potatoe')
    print("Signup response:", signup_response)

    # Login example
    login_response = auth.login('potato@example.com', 'very_potatoe')
    print("Login response:", login_response)