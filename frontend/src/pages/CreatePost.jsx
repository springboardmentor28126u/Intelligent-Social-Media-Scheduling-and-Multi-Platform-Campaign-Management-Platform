import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreatePost.css";

function CreatePost() {

  const [accounts, setAccounts] = useState([]);

  const [socialAccountId, setSocialAccountId] = useState("");

  const [content, setContent] = useState("");

  const [scheduledAt, setScheduledAt] = useState("");

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");


  // =====================================================
  // LOAD SOCIAL ACCOUNTS
  // =====================================================

  const fetchAccounts = async () => {

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/social-accounts/",
        {
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


      setAccounts(data);

    } catch (error) {

      console.error(error);

      alert("Cannot connect to backend");

    }

  };


  // =====================================================
  // CHECK LOGIN
  // =====================================================

  useEffect(() => {

    if (!token) {

      navigate("/login");

      return;
    }


    fetchAccounts();

  }, []);


  // =====================================================
  // CREATE POST
  // =====================================================

  const handleCreatePost = async (e) => {

    e.preventDefault();


    if (!socialAccountId) {

      alert("Please select a social account");

      return;
    }


    if (!content.trim()) {

      alert("Please enter post content");

      return;
    }


    setLoading(true);


    try {

      let url =
        "http://127.0.0.1:8000/posts/" +
        `?social_account_id=${socialAccountId}` +
        `&content=${encodeURIComponent(content)}`;


      if (scheduledAt) {

        url +=
          `&scheduled_at=${encodeURIComponent(scheduledAt)}`;

      }


      const response = await fetch(
        url,
        {
          method: "POST",

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
          data.detail || "Failed to create post"
        );

        return;
      }


      alert(
        data.status === "scheduled"
          ? "Post scheduled successfully!"
          : "Draft created successfully!"
      );


      setSocialAccountId("");

      setContent("");

      setScheduledAt("");


      // Go to My Posts

      navigate("/posts");


    } catch (error) {

      console.error(error);

      alert("Cannot connect to backend");

    } finally {

      setLoading(false);
    }

  };


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="create-post-page">

      <div className="create-post-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="create-post-header">

          <div>

            <h1>
              Create & Schedule Post
            </h1>

            <p>
              Create content and publish it to your
              connected social media account.
            </p>

          </div>


          <button
            type="button"
            className="back-dashboard-button"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="create-post-form"
          onSubmit={handleCreatePost}
        >


          {/* =================================================
              SOCIAL ACCOUNT
          ================================================= */}

          <div className="create-post-form-group">

            <label htmlFor="socialAccount">
              Social Account
            </label>


            {accounts.length === 0 ? (

              <div className="no-accounts-message">

                No social accounts connected.

                <br />

                <button
                  type="button"
                  onClick={() =>
                    navigate("/social-accounts")
                  }
                  style={{
                    marginTop: "10px",
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#8589f8",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  Connect a social account →
                </button>

              </div>

            ) : (

              <select
                id="socialAccount"
                value={socialAccountId}
                onChange={(e) =>
                  setSocialAccountId(e.target.value)
                }
                required
              >

                <option value="">
                  Select account
                </option>


                {accounts.map((account) => (

                  <option
                    key={account.id}
                    value={account.id}
                  >

                    {account.platform} - {account.username}

                  </option>

                ))}

              </select>

            )}

          </div>


          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="create-post-form-group">

            <label htmlFor="content">
              Post Content
            </label>


            <textarea
              id="content"
              placeholder="Write your post..."
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
              required
            />


            <div className="character-count">

              {content.length} characters

            </div>

          </div>


          {/* =================================================
              SCHEDULE
          ================================================= */}

          <div className="create-post-form-group">

            <label htmlFor="scheduledAt">
              Schedule Date & Time
            </label>


            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) =>
                setScheduledAt(e.target.value)
              }
            />


            <div className="schedule-hint">

              Leave this empty to save the post as a
              draft. Select a date and time to schedule it.

            </div>

          </div>


          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            className="create-post-submit"
            disabled={
              loading || accounts.length === 0
            }
          >

            {loading
              ? "Saving..."
              : scheduledAt
                ? "📅 Schedule Post"
                : "📝 Save Draft"
            }

          </button>


        </form>


        {/* =================================================
            BOTTOM ACTIONS
        ================================================= */}

        <div className="create-post-actions">

          <button
            type="button"
            className="create-post-secondary-button"
            onClick={() => navigate("/posts")}
          >
            📝 View My Posts
          </button>


          <button
            type="button"
            className="create-post-secondary-button"
            onClick={() => navigate("/social-accounts")}
          >
            👥 Manage Accounts
          </button>


          <button
            type="button"
            className="create-post-secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            📊 Dashboard
          </button>

        </div>


      </div>

    </div>

  );

}

export default CreatePost;