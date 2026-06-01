import { api } from "../../../shared/services/api"

export const getReportPDF = async () => {
    const response = await api.get("reports/pdf", {
        responseType: "blob",
    });
    return URL.createObjectURL(response.data);
}