# Azure OpenAI Setup Guide

The extension now uses **Azure OpenAI** instead of OpenAI directly. Follow these steps to configure it.

## Prerequisites

- Azure subscription
- Azure OpenAI resource created
- Model deployment configured

## Getting Your Azure Credentials

### 1. API Key

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure OpenAI resource
3. Go to **Keys and Endpoint**
4. Copy **KEY 1** or **KEY 2**

### 2. Instance Name

This is your Azure OpenAI resource name. You can find it:
- In the Azure Portal URL: `https://portal.azure.com/#@.../resource/.../<INSTANCE_NAME>/...`
- Or in the resource overview page

Example: `my-openai-instance`

### 3. Deployment Name

This is the name you gave to your model deployment:

1. Go to your Azure OpenAI resource
2. Click **Model deployments** → **Manage Deployments**
3. Copy the deployment name (e.g., `gpt-4`, `gpt-35-turbo`)

### 4. API Version (Optional)

Default: `2024-02-15-preview`

You can use other versions like:
- `2024-02-01`
- `2023-12-01-preview`
- `2023-05-15`

## Configuring the Extension

1. **Load the extension** in Chrome (`chrome://extensions/`)
2. **Open a Kaggle notebook**
3. **Click the extension icon**
4. **Click the settings icon** (⚙️)
5. **Fill in the fields**:
   - **API Key**: Your Azure OpenAI API key
   - **Instance Name**: Your Azure resource name
   - **Deployment Name**: Your model deployment name
   - **API Version**: (optional) API version to use
6. **Click "Save Configuration"**

## Example Configuration

```
API Key: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
Instance Name: my-openai-eastus
Deployment Name: gpt-4
API Version: 2024-02-15-preview
```

## Supported Models

Any Azure OpenAI deployment that supports:
- Function/tool calling
- Chat completions

Recommended models:
- GPT-4
- GPT-4 Turbo
- GPT-3.5 Turbo

## Troubleshooting

### "Please configure Azure OpenAI settings"
- Ensure all required fields are filled
- Check that API key is valid
- Verify instance and deployment names are correct

### "Error running agent"
- Check Azure OpenAI resource is active
- Verify deployment exists and is running
- Ensure API version is compatible
- Check Azure quota limits

### Connection errors
- Verify network connectivity
- Check Azure firewall rules
- Ensure resource is in correct region

## Cost Considerations

Azure OpenAI charges based on:
- Token usage (input + output)
- Model type (GPT-4 is more expensive than GPT-3.5)

Monitor usage in Azure Portal under **Cost Management**.

## Security

- API keys are stored locally in Chrome storage
- Never share your API key
- Rotate keys regularly in Azure Portal
- Use separate keys for development/production

## Migration from OpenAI

If you were using the previous OpenAI version:

**Old (OpenAI)**:
- Single API key field

**New (Azure OpenAI)**:
- API Key
- Instance Name
- Deployment Name
- API Version

Your old API key will not work with Azure OpenAI. You need Azure-specific credentials.

## Additional Resources

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [Model Deployments Guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource)
