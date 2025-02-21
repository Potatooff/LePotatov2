import json
from typing import Dict, List, Optional
import os

class LLMSettingsManager:
    def __init__(self, settings_file: str = "settings.json"):
        self.settings_file = settings_file
        self.settings = self._load_settings()

    def _load_settings(self) -> Dict:
        """Load settings from JSON file."""
        default_settings = {
            "LLMS_API_LIST": [
                {
                    "Host": "LLMS_API_1",
                    "model": "LLMS_API",
                    "api_key": "1234567890",
                    "context_length": 8192,
                    "openai_compatible_url": "http://localhost:8080/llms/api/v1"
                },
                {
                    "Host": "LLMS_API_2",
                    "model": "LLMS_API",
                    "api_key": "1234567890",
                    "context_length": 8192,
                    "openai_compatible_url": "http://localhost:8081/llms/api/v1"
                }
            ]
        }
        
        if not os.path.exists(self.settings_file):
            os.makedirs(os.path.dirname(self.settings_file), exist_ok=True)
            with open(self.settings_file, 'w') as f:
                json.dump(default_settings, f, indent=4)
            return default_settings
            
        with open(self.settings_file, 'r') as f:
            return json.load(f)

    def _save_settings(self) -> None:
        """Save settings to JSON file."""
        with open(self.settings_file, 'w') as f:
            json.dump(self.settings, f, indent=4)

    def add_llm_config(self, 
                      host: str,
                      model: str,
                      api_key: str,
                      context_length: int,
                      openai_compatible_url: str) -> Dict:
        """Add a new LLM API configuration."""
        new_config = {
            "Host": host,
            "model": model,
            "api_key": api_key,
            "context_length": context_length,
            "openai_compatible_url": openai_compatible_url
        }
        
        self.settings["LLMS_API_LIST"].append(new_config)
        self._save_settings()
        return new_config

    def modify_llm_config(self,
                         host: str,
                         **kwargs) -> Optional[Dict]:
        """Modify an existing LLM API configuration."""
        for config in self.settings["LLMS_API_LIST"]:
            if config["Host"] == host:
                config.update(kwargs)
                self._save_settings()
                return config
        return None

    def get_llm_config(self, host: str) -> Optional[Dict]:
        """Get a specific LLM API configuration."""
        for config in self.settings["LLMS_API_LIST"]:
            if config["Host"] == host:
                return config
        return None

    def list_llm_configs(self) -> List[Dict]:
        """List all LLM API configurations."""
        return self.settings["LLMS_API_LIST"]

    def delete_llm_config(self, host: str) -> bool:
        """Delete a specific LLM API configuration."""
        for i, config in enumerate(self.settings["LLMS_API_LIST"]):
            if config["Host"] == host:
                self.settings["LLMS_API_LIST"].pop(i)
                self._save_settings()
                return True
        return False

