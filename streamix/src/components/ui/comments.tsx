import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import type { VideoData } from "../../pages/watch/[id]";

interface CommentsProps {
  video: VideoData;
}

interface CommentItem {
  _id: string;

  userid: {
    _id: string;
    name: string;
    image?: string;
    location?: string;
    showLocation?: boolean;
  };

  videoid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;

  likes: string[];
  dislikes: string[];

  reports: {
    user: string;
    reportedAt: string;
  }[];

  status: "active" | "flagged";
  translatedText?: string;
}

export const Comments = ({ video }: CommentsProps) => {
  const { user } = useUser();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");


  useEffect(() => {
    if (video?._id) {
      loadComments();
    }
  }, [video?._id]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${video._id}`);
      setComments(res.data);
    } catch (err) {
      console.log("Error loading comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || !newCommentText.trim()) return;

    setIsSubmitting(true);

    try {
      const currentUserId = user._id || (user as any).id;
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: video._id,
        userid: currentUserId,
        commentbody: newCommentText,
        usercommented: user.name,
      });

      if (res.data.comment) {
        loadComments();
        setNewCommentText("");
      }
    } catch (err: any) {
      console.log("Error adding comment:", err);

      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("Something went wrong.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);

      if (res.data.comment) {
        setComments((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.log("Error deleting comment:", err);
    }
  };

  const handleStartEdit = (comment: CommentItem) => {
    setEditingCommentId(comment._id);
    setEditCommentText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editCommentText.trim() || !editingCommentId) return;

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        {
          commentbody: editCommentText,
        }
      );

      if (res.data) {
        setComments((prev) =>
          prev.map((item) =>
            item._id === editingCommentId
              ? { ...item, commentbody: editCommentText }
              : item
          )
        );

        setEditingCommentId(null);
        setEditCommentText("");
      }
    } catch (err) {
      console.log("Error updating comment:", err);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      const currentUserId = user._id || (user as any).id;

      const res = await axiosInstance.post(
        `/comment/like/${commentId}`,
        {
          userid: currentUserId,
        }
      );

      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId ? res.data : comment
        )
      );
    } catch (err) {
      console.log("Error liking comment:", err);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      const currentUserId = user._id || (user as any).id;

      const res = await axiosInstance.post(
        `/comment/dislike/${commentId}`,
        {
          userid: currentUserId,
        }
      );

      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId ? res.data : comment
        )
      );

    } catch (err) {
      console.log("Error disliking comment:", err);
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!user) return;

    try {
      const currentUserId = user._id || (user as any).id;

      const res = await axiosInstance.post(
        `/comment/report/${commentId}`,
        {
          userid: currentUserId,
        }
      );


      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId ? res.data : comment
        )
      );


    } catch (err: any) {
      console.log("Error reporting comment:", err);

      if (err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  };

  const handleTranslateComment = async (commentId: string, text: string) => {
    try {
      const res = await axiosInstance.post(
        "/comment/translate",
        {
          text,
          targetLanguage: "hi",
        }
      );

      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? {
              ...comment,
              translatedText: res.data.translatedText,
            }
            : comment
        )
      );

    } catch (error) {
      console.log("Translation error:", error);
    }
  };

  if (loading) {
    return <div className="py-4 text-sm text-gray-500">Loading comments...</div>;
  }

  const currentUserId = user?._id || (user as any)?.id;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {comments.length} Comments
        </h2>
      </div>

      {user && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
          />

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setNewCommentText("")}
              className="rounded-full px-4 py-2 text-sm transition hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              onClick={handleAddComment}
              disabled={!newCommentText.trim() || isSubmitting}
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:bg-gray-300"
            >
              {isSubmitting ? "Posting..." : "Comment"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500 font-medium">
              No comments yet 👋
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Be the first to start the discussion!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="rounded-xl border border-gray-200 p-4 transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <img
                    src={comment.userid.image || "/default-avatar.png"}
                    alt={comment.userid.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {comment.userid.name}
                      <span className="ml-2 font-normal text-gray-500">
                        •{" "}
                        {comment.commentedon
                          ? `${formatDistanceToNow(
                            new Date(comment.commentedon)
                          )} ago`
                          : "Just now"}
                      </span>
                    </p>

                    {comment.userid.showLocation &&
                      comment.userid.location && (
                        <p className="mt-1 text-xs text-gray-500">
                          📍 {comment.userid.location}
                        </p>
                      )}
                  </div>
                </div>

                {currentUserId &&
                  comment.userid._id === currentUserId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(comment)}
                        className="rounded-full px-3 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteComment(comment._id)
                        }
                        className="rounded-full px-3 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
              </div>

              {editingCommentId === comment._id ? (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={editCommentText}
                    onChange={(e) =>
                      setEditCommentText(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-blue-500"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditCommentText("");
                      }}
                      className="rounded-md border border-gray-300 px-3 py-2 text-xs transition hover:bg-gray-100"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleUpdateComment}
                      disabled={!editCommentText.trim()}
                      className="rounded-md bg-blue-600 px-4 py-2 text-xs text-white transition hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-800">
                    {comment.commentbody}
                  </p>

                  {comment.translatedText && (
                    <div className="mt-4 rounded-lg border-l-4 border-green-500 bg-green-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Translated
                      </p>

                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {comment.translatedText}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() =>
                        handleLikeComment(comment._id)
                      }
                      className="rounded-full px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-blue-600"
                    >
                      👍 {comment.likes?.length || 0}
                    </button>

                    <button
                      onClick={() =>
                        handleDislikeComment(comment._id)
                      }
                      className="rounded-full px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-red-600"
                    >
                      👎 {comment.dislikes?.length || 0}
                    </button>

                    <button
                      onClick={() =>
                        handleReportComment(comment._id)
                      }
                      className="rounded-full px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-orange-600"
                    >
                      🚩 Report
                    </button>

                    <button
                      onClick={() =>
                        handleTranslateComment(
                          comment._id,
                          comment.commentbody
                        )
                      }
                      className="rounded-full px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-green-600"
                    >
                      🌐 Translate
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
export default Comments; 