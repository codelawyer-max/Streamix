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
  userid: string;
  videoid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
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
    } catch (err) {
      console.log("Error adding comment:", err);
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
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
          />

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setNewCommentText("")}
              className="rounded-full px-3 py-1.5 text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleAddComment}
              disabled={!newCommentText.trim() || isSubmitting}
              className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:bg-gray-300 transition-colors"
            >
              Comment
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No comments yet. Be the first to comment.
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{comment.usercommented}</p>

                  <p className="text-xs text-gray-500">
                    {comment.commentedon
                      ? `${formatDistanceToNow(new Date(comment.commentedon))} ago`
                      : "Just now"}
                  </p>
                </div>

                {currentUserId && comment.userid === currentUserId && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleStartEdit(comment)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {editingCommentId === comment._id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={editCommentText}
                    onChange={(e) => setEditCommentText(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-blue-500"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditCommentText("");
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleUpdateComment}
                      disabled={!editCommentText.trim()}
                      className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-800">{comment.commentbody}</p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default Comments;