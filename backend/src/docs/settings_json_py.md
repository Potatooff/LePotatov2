# Example usage
Will work on main.py, need to change path if you change directory level

```python
    # Print current configurations

    config_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'config',
        'settings.json'
    )

    settings_manager = LLMSettingsManager(settings_file=config_path)

    print("Current LLM configurations:")
    print(settings_manager.list_llm_configs())

    # Add a new configuration
    new_config = settings_manager.add_llm_config(
        host="Mistral.AI",
        model="mistral-small-latest",
        api_key="kCOMF3x2kQP0kU2gkqTKUEmeXg5nZvE7",
        context_length=8192,
        openai_compatible_url="https://api.mistral.ai/v1"
    )

    # Print current configurations
    print("Current LLM configurations:")
    print(settings_manager.list_llm_configs())
```