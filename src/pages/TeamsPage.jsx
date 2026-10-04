import { useEffect, useState } from "react";
import teamService from "../services/teamService";
import "./TeamsPage.css";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showInvitationForm, setShowInvitationForm] = useState(false);

  const [teamForm, setTeamForm] = useState({
    name: "",
    slug: "",
    description: "",
    avatar_url: "",
  });

  const [memberForm, setMemberForm] = useState({
    user_id: "",
    role: "member",
    can_publish: false,
    can_approve: false,
  });

  const [invitationForm, setInvitationForm] = useState({
    email: "",
    role: "member",
  });

  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam.id);
    }
  }, [selectedTeam]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await teamService.getTeams();

      const teamList = Array.isArray(response.data)
        ? response.data
        : [];

      setTeams(teamList);

      if (teamList.length > 0) {
        setSelectedTeam((current) => {
          if (current) {
            return (
              teamList.find((team) => team.id === current.id) ||
              teamList[0]
            );
          }

          return teamList[0];
        });
      } else {
        setSelectedTeam(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load your teams."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (teamId) => {
    try {
      setDetailsLoading(true);
      setError("");

      const [membersResponse, invitationsResponse] =
        await Promise.all([
          teamService.getMembers(teamId),
          teamService.getInvitations(teamId),
        ]);

      setMembers(
        Array.isArray(membersResponse.data)
          ? membersResponse.data
          : []
      );

      setInvitations(
        Array.isArray(invitationsResponse.data)
          ? invitationsResponse.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load team details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTeamFormChange = (event) => {
    const { name, value } = event.target;

    setTeamForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleMemberFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setMemberForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleInvitationFormChange = (event) => {
    const { name, value } = event.target;

    setInvitationForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTeamNameChange = (event) => {
    const name = event.target.value;

    setTeamForm((previous) => ({
      ...previous,
      name,
      slug:
        previous.slug === "" ||
        previous.slug === generateSlug(previous.name)
          ? generateSlug(name)
          : previous.slug,
    }));
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    clearMessages();

    try {
      const response = await teamService.createTeam({
        name: teamForm.name,
        slug: teamForm.slug,
        description: teamForm.description || null,
        avatar_url: teamForm.avatar_url || null,
      });

      const newTeam = response.data;

      setTeams((previous) => [...previous, newTeam]);
      setSelectedTeam(newTeam);

      setTeamForm({
        name: "",
        slug: "",
        description: "",
        avatar_url: "",
      });

      setShowCreateForm(false);
      setSuccess("Team created successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to create the team."
      );
    }
  };

  const openEditTeam = () => {
    if (!selectedTeam) return;

    setTeamForm({
      name: selectedTeam.name || "",
      slug: selectedTeam.slug || "",
      description: selectedTeam.description || "",
      avatar_url: selectedTeam.avatar_url || "",
    });

    setShowEditForm(true);
    setShowCreateForm(false);
    clearMessages();
  };

  const handleUpdateTeam = async (event) => {
    event.preventDefault();

    if (!selectedTeam) return;

    clearMessages();

    try {
      const response = await teamService.updateTeam(
        selectedTeam.id,
        {
          name: teamForm.name,
          slug: teamForm.slug,
          description: teamForm.description || null,
          avatar_url: teamForm.avatar_url || null,
        }
      );

      const updatedTeam = response.data;

      setTeams((previous) =>
        previous.map((team) =>
          team.id === updatedTeam.id ? updatedTeam : team
        )
      );

      setSelectedTeam(updatedTeam);
      setShowEditForm(false);

      setSuccess("Team updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update the team."
      );
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${selectedTeam.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    clearMessages();

    try {
      await teamService.deleteTeam(selectedTeam.id);

      const remainingTeams = teams.filter(
        (team) => team.id !== selectedTeam.id
      );

      setTeams(remainingTeams);
      setSelectedTeam(remainingTeams[0] || null);
      setMembers([]);
      setInvitations([]);

      setSuccess("Team deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete the team."
      );
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    if (!selectedTeam) return;

    clearMessages();

    try {
      await teamService.addMember(selectedTeam.id, {
        user_id: Number(memberForm.user_id),
        role: memberForm.role,
        can_publish: memberForm.can_publish,
        can_approve: memberForm.can_approve,
      });

      setMemberForm({
        user_id: "",
        role: "member",
        can_publish: false,
        can_approve: false,
      });

      setShowMemberForm(false);

      await loadTeamDetails(selectedTeam.id);

      setSuccess("Member added successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to add the member."
      );
    }
  };

  const startEditingMember = (member) => {
    setEditingMember(member);

    setMemberForm({
      user_id: member.user_id,
      role: member.role || "member",
      can_publish: Boolean(member.can_publish),
      can_approve: Boolean(member.can_approve),
    });

    setShowMemberForm(false);
    clearMessages();
  };

  const handleUpdateMember = async (event) => {
    event.preventDefault();

    if (!selectedTeam || !editingMember) return;

    clearMessages();

    try {
      await teamService.updateMember(
        selectedTeam.id,
        editingMember.user_id,
        {
          role: memberForm.role,
          can_publish: memberForm.can_publish,
          can_approve: memberForm.can_approve,
        }
      );

      setEditingMember(null);

      setMemberForm({
        user_id: "",
        role: "member",
        can_publish: false,
        can_approve: false,
      });

      await loadTeamDetails(selectedTeam.id);

      setSuccess("Member permissions updated.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update the member."
      );
    }
  };

  const handleDeleteMember = async (member) => {
    if (!selectedTeam) return;

    const confirmed = window.confirm(
      `Remove user ${member.user_id} from this team?`
    );

    if (!confirmed) return;

    clearMessages();

    try {
      await teamService.deleteMember(
        selectedTeam.id,
        member.user_id
      );

      await loadTeamDetails(selectedTeam.id);

      setSuccess("Member removed successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to remove the member."
      );
    }
  };

  const handleCreateInvitation = async (event) => {
    event.preventDefault();

    if (!selectedTeam) return;

    clearMessages();

    try {
      await teamService.createInvitation(
        selectedTeam.id,
        {
          email: invitationForm.email,
          role: invitationForm.role,
        }
      );

      setInvitationForm({
        email: "",
        role: "member",
      });

      setShowInvitationForm(false);

      await loadTeamDetails(selectedTeam.id);

      setSuccess("Invitation created successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to create the invitation."
      );
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!selectedTeam) return;

    const confirmed = window.confirm(
      "Delete this invitation?"
    );

    if (!confirmed) return;

    clearMessages();

    try {
      await teamService.deleteInvitation(
        selectedTeam.id,
        invitationId
      );

      setInvitations((previous) =>
        previous.filter(
          (invitation) => invitation.id !== invitationId
        )
      );

      setSuccess("Invitation deleted.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete the invitation."
      );
    }
  };

  const cancelMemberEdit = () => {
    setEditingMember(null);

    setMemberForm({
      user_id: "",
      role: "member",
      can_publish: false,
      can_approve: false,
    });
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="teams-page">
        <div className="teams-loading">
          <div className="loading-spinner" />
          <p>Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="teams-header">
        <div>
          <p className="page-eyebrow">WORKSPACE</p>
          <h1>Team Management</h1>
          <p className="page-subtitle">
            Manage your teams, members, permissions, and invitations.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setShowCreateForm(true);
            setShowEditForm(false);
            clearMessages();
          }}
        >
          + Create Team
        </button>
      </div>

      {error && (
        <div className="message error-message">
          <span>⚠</span>
          {error}
        </div>
      )}

      {success && (
        <div className="message success-message">
          <span>✓</span>
          {success}
        </div>
      )}

      {showCreateForm && (
        <div className="team-form-card">
          <div className="form-card-header">
            <div>
              <h2>Create a Team</h2>
              <p>Set up a workspace for your social media team.</p>
            </div>

            <button
              className="close-button"
              onClick={() => setShowCreateForm(false)}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleCreateTeam}>
            <div className="form-grid">
              <div className="form-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  name="name"
                  value={teamForm.name}
                  onChange={handleTeamNameChange}
                  placeholder="Marketing Team"
                  required
                />
              </div>

              <div className="form-group">
                <label>Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={teamForm.slug}
                  onChange={handleTeamFormChange}
                  placeholder="marketing-team"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  name="description"
                  value={teamForm.description}
                  onChange={handleTeamFormChange}
                  placeholder="Describe what this team is responsible for..."
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label>Avatar URL</label>
                <input
                  type="url"
                  name="avatar_url"
                  value={teamForm.avatar_url}
                  onChange={handleTeamFormChange}
                  placeholder="https://example.com/avatar.png"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
              >
                Create Team
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="teams-layout">
        <aside className="teams-sidebar">
          <div className="sidebar-title">
            <span>Your Teams</span>
            <span className="team-count">
              {teams.length}
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="empty-sidebar">
              <div className="empty-icon">👥</div>
              <p>No teams yet.</p>
              <small>Create your first team to get started.</small>
            </div>
          ) : (
            <div className="team-list">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className={`team-list-item ${
                    selectedTeam?.id === team.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedTeam(team);
                    setShowEditForm(false);
                    setEditingMember(null);
                    clearMessages();
                  }}
                >
                  <div className="team-avatar">
                    {team.avatar_url ? (
                      <img
                        src={team.avatar_url}
                        alt={team.name}
                      />
                    ) : (
                      team.name?.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="team-list-info">
                    <strong>{team.name}</strong>
                    <span>{team.slug}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="team-content">
          {!selectedTeam ? (
            <div className="empty-team-state">
              <div className="large-empty-icon">👥</div>
              <h2>Welcome to Team Management</h2>
              <p>
                Create a team to collaborate with your social
                media team members.
              </p>

              <button
                className="primary-button"
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Team
              </button>
            </div>
          ) : (
            <>
              <section className="team-overview-card">
                <div className="team-overview-main">
                  <div className="large-team-avatar">
                    {selectedTeam.avatar_url ? (
                      <img
                        src={selectedTeam.avatar_url}
                        alt={selectedTeam.name}
                      />
                    ) : (
                      selectedTeam.name
                        ?.charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div>
                    <div className="team-title-row">
                      <h2>{selectedTeam.name}</h2>
                      <span className="owner-badge">
                        Team
                      </span>
                    </div>

                    <p className="team-slug">
                      /{selectedTeam.slug}
                    </p>

                    {selectedTeam.description && (
                      <p className="team-description">
                        {selectedTeam.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="team-overview-actions">
                  <button
                    className="secondary-button"
                    onClick={openEditTeam}
                  >
                    Edit
                  </button>

                  <button
                    className="danger-button"
                    onClick={handleDeleteTeam}
                  >
                    Delete
                  </button>
                </div>
              </section>

              {showEditForm && (
                <section className="team-form-card">
                  <div className="form-card-header">
                    <div>
                      <h2>Edit Team</h2>
                      <p>Update your team's information.</p>
                    </div>

                    <button
                      className="close-button"
                      onClick={() =>
                        setShowEditForm(false)
                      }
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleUpdateTeam}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Team Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={teamForm.name}
                          onChange={handleTeamFormChange}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Slug *</label>
                        <input
                          type="text"
                          name="slug"
                          value={teamForm.slug}
                          onChange={handleTeamFormChange}
                          required
                        />
                      </div>

                      <div className="form-group full-width">
                        <label>Description</label>
                        <textarea
                          name="description"
                          value={teamForm.description}
                          onChange={handleTeamFormChange}
                          rows="3"
                        />
                      </div>

                      <div className="form-group full-width">
                        <label>Avatar URL</label>
                        <input
                          type="url"
                          name="avatar_url"
                          value={teamForm.avatar_url}
                          onChange={handleTeamFormChange}
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setShowEditForm(false)
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="management-card">
                <div className="section-header">
                  <div>
                    <h2>Team Members</h2>
                    <p>
                      Manage who can access this team.
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setShowMemberForm(!showMemberForm);
                      setEditingMember(null);
                      clearMessages();
                    }}
                  >
                    + Add Member
                  </button>
                </div>

                {showMemberForm && (
                  <form
                    className="inline-form"
                    onSubmit={handleAddMember}
                  >
                    <h3>Add Team Member</h3>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>User ID *</label>
                        <input
                          type="number"
                          name="user_id"
                          value={memberForm.user_id}
                          onChange={handleMemberFormChange}
                          placeholder="e.g. 5"
                          min="1"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Role</label>
                        <select
                          name="role"
                          value={memberForm.role}
                          onChange={handleMemberFormChange}
                        >
                          <option value="member">
                            Member
                          </option>
                          <option value="admin">
                            Admin
                          </option>
                          <option value="manager">
                            Manager
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="checkbox-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="can_publish"
                          checked={memberForm.can_publish}
                          onChange={handleMemberFormChange}
                        />
                        Can publish
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="can_approve"
                          checked={memberForm.can_approve}
                          onChange={handleMemberFormChange}
                        />
                        Can approve
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setShowMemberForm(false)
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                      >
                        Add Member
                      </button>
                    </div>
                  </form>
                )}

                {editingMember && (
                  <form
                    className="inline-form"
                    onSubmit={handleUpdateMember}
                  >
                    <div className="edit-member-header">
                      <div>
                        <h3>Edit Member</h3>
                        <p>
                          User ID:{" "}
                          <strong>
                            {editingMember.user_id}
                          </strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        className="close-button"
                        onClick={cancelMemberEdit}
                      >
                        ×
                      </button>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Role</label>
                        <select
                          name="role"
                          value={memberForm.role}
                          onChange={handleMemberFormChange}
                        >
                          <option value="member">
                            Member
                          </option>
                          <option value="admin">
                            Admin
                          </option>
                          <option value="manager">
                            Manager
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="checkbox-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="can_publish"
                          checked={memberForm.can_publish}
                          onChange={handleMemberFormChange}
                        />
                        Can publish
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="can_approve"
                          checked={memberForm.can_approve}
                          onChange={handleMemberFormChange}
                        />
                        Can approve
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={cancelMemberEdit}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                      >
                        Save Permissions
                      </button>
                    </div>
                  </form>
                )}

                {detailsLoading ? (
                  <div className="section-loading">
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="section-empty">
                    <div>👤</div>
                    <p>No members found.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="management-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Role</th>
                          <th>Publish</th>
                          <th>Approve</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {members.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <strong>
                                #{member.user_id}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`role-badge ${member.role}`}
                              >
                                {member.role}
                              </span>
                            </td>

                            <td>
                              {member.can_publish ? (
                                <span className="permission-yes">
                                  ✓
                                </span>
                              ) : (
                                <span className="permission-no">
                                  —
                                </span>
                              )}
                            </td>

                            <td>
                              {member.can_approve ? (
                                <span className="permission-yes">
                                  ✓
                                </span>
                              ) : (
                                <span className="permission-no">
                                  —
                                </span>
                              )}
                            </td>

                            <td>
                              {formatDate(member.created_at)}
                            </td>

                            <td>
                              <div className="table-actions">
                                <button
                                  className="small-button"
                                  onClick={() =>
                                    startEditingMember(
                                      member
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  className="small-danger-button"
                                  onClick={() =>
                                    handleDeleteMember(
                                      member
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="management-card">
                <div className="section-header">
                  <div>
                    <h2>Team Invitations</h2>
                    <p>
                      Invite people to join this team.
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => {
                      setShowInvitationForm(
                        !showInvitationForm
                      );
                      clearMessages();
                    }}
                  >
                    + Invite Member
                  </button>
                </div>

                {showInvitationForm && (
                  <form
                    className="inline-form"
                    onSubmit={handleCreateInvitation}
                  >
                    <h3>Create Invitation</h3>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={invitationForm.email}
                          onChange={
                            handleInvitationFormChange
                          }
                          placeholder="member@example.com"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Role</label>
                        <select
                          name="role"
                          value={invitationForm.role}
                          onChange={
                            handleInvitationFormChange
                          }
                        >
                          <option value="member">
                            Member
                          </option>
                          <option value="admin">
                            Admin
                          </option>
                          <option value="manager">
                            Manager
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setShowInvitationForm(false)
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                      >
                        Create Invitation
                      </button>
                    </div>
                  </form>
                )}

                {detailsLoading ? (
                  <div className="section-loading">
                    Loading invitations...
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="section-empty">
                    <div>✉</div>
                    <p>No invitations yet.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="management-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Expires</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {invitations.map((invitation) => (
                          <tr key={invitation.id}>
                            <td>
                              <strong>
                                {invitation.email}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`role-badge ${invitation.role}`}
                              >
                                {invitation.role}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`status-badge ${invitation.status}`}
                              >
                                {invitation.status}
                              </span>
                            </td>

                            <td>
                              {formatDate(
                                invitation.expires_at
                              )}
                            </td>

                            <td>
                              {formatDate(
                                invitation.created_at
                              )}
                            </td>

                            <td>
                              <button
                                className="small-danger-button"
                                onClick={() =>
                                  handleDeleteInvitation(
                                    invitation.id
                                  )
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}