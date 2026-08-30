import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SocialAccounts.css";

function SocialAccounts() {
  // =====================================================
  // STATE
  // =====================================================

  const [accounts, setAccounts] = useState([]);

  const [platform, setPlatform] = useState("instagram");

  const [username, setUsername] = useState("");

  // Token for each social account
  const [tokenInput, setTokenInput] = useState({});

  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");


  // =====================================================
  // GET SOCIAL ACCOUNTS
  // =====================================================

  const fetchAccounts = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/social-accounts/",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.detail || "Failed to load social accounts"
        );
        return;
      }

      console.log("Accounts:", data);

      setAccounts(data);

    } catch (error) {
      console.error(
        "Fetch accounts error:",
        error
      );

      alert("Cannot connect to backend");
    }
  };


  // =====================================================
  // LOAD ACCOUNTS WHEN PAGE OPENS
  // =====================================================

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchAccounts();
  }, []);


  // =====================================================
  // ADD SOCIAL ACCOUNT
  // =====================================================

  const addAccount = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      alert("Please enter username");
      return;
    }

    try {
      const url =
        "http://127.0.0.1:8000/social-accounts/" +
        `?platform=${encodeURIComponent(platform)}` +
        `&username=${encodeURIComponent(
          username.trim()
        )}`;

      console.log("Adding account:", url);

      const response = await fetch(url, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      console.log("Add response:", data);

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        alert(
          data.detail || "Failed to add account"
        );
        return;
      }

      alert(
        "Social account added successfully!"
      );

      setUsername("");

      await fetchAccounts();

    } catch (error) {
      console.error(
        "Add account error:",
        error
      );

      alert("Cannot connect to backend");
    }
  };


  // =====================================================
  // CONNECT SOCIAL ACCOUNT
  // =====================================================

  const connectAccount = async (accountId) => {

    const accessToken =
      tokenInput[accountId];

    // Check token
    if (!accessToken || !accessToken.trim()) {
      alert("Please enter test token");
      return;
    }

    console.log(
      "Connecting account:",
      accountId
    );

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/social-accounts/${accountId}/connect?access_token=${encodeURIComponent(
          accessToken.trim()
        )}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log(
        "Connect response:",
        data
      );

      if (response.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        navigate("/login");

        return;
      }

      if (!response.ok) {
        alert(
          data.detail ||
            "Failed to connect account"
        );

        return;
      }

      alert(
        "Social account connected successfully!"
      );

      // Remove token from input after successful connection
      setTokenInput((previous) => {

        const updated = {
          ...previous
        };

        delete updated[accountId];

        return updated;
      });

      // Refresh account list
      await fetchAccounts();

    } catch (error) {

      console.error(
        "Connect error:",
        error
      );

      alert("Cannot connect to backend");
    }
  };


  // =====================================================
  // DISCONNECT SOCIAL ACCOUNT
  // =====================================================

  const disconnectAccount = async (
    accountId
  ) => {

    const confirmDisconnect =
      window.confirm(
        "Are you sure you want to disconnect this social account?"
      );

    if (!confirmDisconnect) {
      return;
    }

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/social-accounts/${accountId}/disconnect`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log(
        "Disconnect response:",
        data
      );

      if (response.status === 401) {

        localStorage.removeItem(
          "access_token"
        );

        navigate("/login");

        return;
      }

      if (!response.ok) {

        alert(
          data.detail ||
            "Failed to disconnect account"
        );

        return;
      }

      alert(
        "Social account disconnected successfully!"
      );

      await fetchAccounts();

    } catch (error) {

      console.error(
        "Disconnect error:",
        error
      );

      alert("Cannot connect to backend");
    }
  };


  // =====================================================
  // DELETE SOCIAL ACCOUNT
  // =====================================================

  const deleteAccount = async (
    accountId
  ) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this social account?"
      );

    if (!confirmDelete) {
      return;
    }

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/social-accounts/${accountId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log(
        "Delete response:",
        data
      );

      if (response.status === 401) {

        localStorage.removeItem(
          "access_token"
        );

        navigate("/login");

        return;
      }

      if (!response.ok) {

        alert(
          data.detail ||
            "Failed to delete account"
        );

        return;
      }

      alert(
        "Social account deleted successfully!"
      );

      await fetchAccounts();

    } catch (error) {

      console.error(
        "Delete error:",
        error
      );

      alert("Cannot connect to backend");
    }
  };


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="social-accounts-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="social-accounts-header">

        <h1>
          Social Accounts
        </h1>

        <p>
          Connect and manage your social media accounts.
        </p>

      </div>



      {/* =================================================
          ADD ACCOUNT
      ================================================= */}

      <div className="add-account-card">

        <h2>
          Add Social Account
        </h2>


        <form
          onSubmit={addAccount}
          className="social-form"
        >


          {/* PLATFORM */}

          <div className="form-group">

            <label>
              Platform
            </label>

            <select
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value)
              }
            >

              <option value="instagram">
                Instagram
              </option>

              <option value="facebook">
                Facebook
              </option>

              <option value="linkedin">
                LinkedIn
              </option>

              <option value="twitter">
                Twitter
              </option>

            </select>

          </div>



          {/* USERNAME */}

          <div className="form-group">

            <label>
              Username
            </label>

            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
            />

          </div>



          {/* ADD BUTTON */}

          <button
            type="submit"
            className="add-account-button"
          >
            Add Account
          </button>

        </form>

      </div>



      {/* =================================================
          EXISTING ACCOUNTS
      ================================================= */}

      <div className="accounts-section">

        <h2>
          My Social Accounts
        </h2>


        {accounts.length === 0 ? (

          <div className="no-accounts">

            No social accounts found.

          </div>

        ) : (

          <div className="accounts-grid">


            {accounts.map(
              (account) => (

                <div
                  className="account-card"
                  key={account.id}
                >


                  {/* PLATFORM */}

                  <div className="account-platform">

                    {account.platform}

                  </div>



                  {/* USERNAME */}

                  <p className="account-info">

                    <strong>
                      Username:
                    </strong>{" "}

                    {account.username}

                  </p>



                  {/* STATUS */}

                  <p className="account-info">

                    <strong>
                      Status:
                    </strong>{" "}

                    <span
                      className={
                        account.connected
                          ? "account-status status-connected"
                          : "account-status status-disconnected"
                      }
                    >

                      {account.connected
                        ? "Connected"
                        : "Not Connected"}

                    </span>

                  </p>



                  {/* =================================================
                      TOKEN INPUT + CONNECT
                  ================================================= */}

                  {!account.connected && (

                    <div className="token-section">

                      <input
                        type="text"
                        className="token-input"
                        placeholder="Enter test token"
                        value={
                          tokenInput[
                            account.id
                          ] || ""
                        }
                        onChange={(e) =>
                          setTokenInput({
                            ...tokenInput,

                            [account.id]:
                              e.target.value,
                          })
                        }
                      />


                      <button
                        type="button"
                        className="connect-button"
                        onClick={() =>
                          connectAccount(
                            account.id
                          )
                        }
                      >
                        Connect
                      </button>

                    </div>

                  )}



                  {/* =================================================
                      ACTION BUTTONS
                  ================================================= */}

                  <div className="account-actions">


                    {/* DISCONNECT */}

                    {account.connected && (

                      <button
                        type="button"
                        className="disconnect-button"
                        onClick={() =>
                          disconnectAccount(
                            account.id
                          )
                        }
                      >
                        Disconnect
                      </button>

                    )}



                    {/* DELETE */}

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        deleteAccount(
                          account.id
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>



      {/* =================================================
          BACK TO DASHBOARD
      ================================================= */}

      <div className="back-dashboard">

        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

      </div>

    </div>

  );
}

export default SocialAccounts;