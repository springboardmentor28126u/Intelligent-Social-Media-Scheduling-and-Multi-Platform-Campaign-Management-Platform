import api from "./api";

const notificationService = {
  getNotifications: () =>
    api.get("/notifications/"),

  getUnread: () =>
    api.get("/notifications/unread"),

  getCount: () =>
    api.get("/notifications/count"),

  create: (data) =>
    api.post("/notifications/", data),

  markRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),

  markAllRead: () =>
    api.put("/notifications/read-all"),

  delete: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),
};

export default notificationService;