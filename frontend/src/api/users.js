import { sendGet } from '../utils/request'

export const $fetchUsers = async (params) => {
    return await sendGet("/api/users", params, "");
}