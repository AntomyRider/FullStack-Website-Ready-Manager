import axios from "axios";

const historyApi = axios.create({
    baseURL: "/api/history",
    withCredentials: true
})

export const getHistory = async () => {
    try {
        const res = await historyApi.get('/get')
        return res
    } catch (error) {
        return {
            success: false,
            message: error.message,
        }
    }
}

