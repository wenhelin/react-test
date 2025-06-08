import { sendGet } from '../utils/request'

export const $fetchOrders = async (params) => {
    return await sendGet("/api/orders", params, "");
}