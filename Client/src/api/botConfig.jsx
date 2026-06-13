import axios from "axios";

const botConfigApi = axios.create({
    baseURL: "/api/bot-config",
    withCredentials: true
});

export const getBotConfig = async () => {
    try {
        const res = await botConfigApi.get("");
        return res.data;
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: error.message,
        };
    }
};

export const updateBotConfig = async (form) => {
    try {
        const res = await botConfigApi.put("", form);
        return res.data;
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: error.message,
        };
    }
};
