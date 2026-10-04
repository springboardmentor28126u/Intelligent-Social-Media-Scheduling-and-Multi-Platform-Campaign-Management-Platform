import api from "./api";

const teamService = {
  getTeams: () => api.get("/teams/"),

  getTeam: (teamId) => api.get(`/teams/${teamId}`),

  createTeam: (data) => api.post("/teams/", data),

  updateTeam: (teamId, data) => api.put(`/teams/${teamId}`, data),

  deleteTeam: (teamId) => api.delete(`/teams/${teamId}`),

  getMembers: (teamId) =>
    api.get(`/teams/${teamId}/members`),

  addMember: (teamId, data) =>
    api.post(`/teams/${teamId}/members`, data),

  updateMember: (teamId, userId, data) =>
    api.put(`/teams/${teamId}/members/${userId}`, data),

  deleteMember: (teamId, userId) =>
    api.delete(`/teams/${teamId}/members/${userId}`),

  getInvitations: (teamId) =>
    api.get(`/teams/${teamId}/invitations`),

  createInvitation: (teamId, data) =>
    api.post(`/teams/${teamId}/invitations`, data),

  deleteInvitation: (teamId, invitationId) =>
    api.delete(`/teams/${teamId}/invitations/${invitationId}`),
};

export default teamService;