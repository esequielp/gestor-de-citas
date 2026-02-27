import axios from 'axios';

const testApi = async () => {
    try {
        const res = await axios.put('http://localhost:3000/api/settings/chatbot', {
            businessType: 'Centro de estética y cuidado personal',
            businessName: 'VeganoCosmetics',
            greeting: '¡Hola! Soy tu asistente virtual de VeganoCosmetics.',
            personality: 'Test',
            customInstructions: 'test',
            enabled: true
        }, {
            headers: {
                'X-Tenant-Id': 'eb1a20ab-d82e-4d2c-ac34-64ecb0afb161'
            }
        });
        console.log("Success:", res.data);
    } catch (error: any) {
        if (error.response) {
            console.error("API Error Response Data:", error.response.data);
            console.error("API Error Status:", error.response.status);
            console.error("API Error URL:", error.config.url);
        } else {
            console.error("Axios Error:", error.message);
        }
    }
}
testApi();
