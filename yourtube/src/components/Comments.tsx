import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  cityName?: string;
  likes?: string[];
  dislikes?: string[];
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  
  const [city, setCity] = useState("Unknown");
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [targetLanguages, setTargetLanguages] = useState<Record<string, string>>({});

  useEffect(() => {
    loadComments();
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.city) setCity(data.city);
      })
      .catch((err) => console.log("Failed to get city:", err));
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    // Block comments containing special characters
    const hasSpecialChar = /[~`@#$%\^&*_+=\[\]{}|\\<>]/g.test(newComment);
    if (hasSpecialChar) {
      toast.error("Comments containing special characters are blocked!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        cityName: city,
      });
      if (res.data.comment) {
        const newCommentObj: Comment = {
          _id: res.data.data?._id || Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          commentedon: new Date().toISOString(),
          cityName: city,
          likes: [],
          dislikes: [],
        };
        setComments([newCommentObj, ...comments]);
        toast.success("Comment posted successfully!");
      }
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    const hasSpecialChar = /[~`@#$%\^&*_+=\[\]{}|\\<>]/g.test(editText);
    if (hasSpecialChar) {
      toast.error("Comments containing special characters are blocked!");
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        // Clear any previous translation for this comment
        setTranslatedComments((prev) => {
          const copy = { ...prev };
          delete copy[editingCommentId!];
          return copy;
        });
        setEditingCommentId(null);
        setEditText("");
        toast.success("Comment updated successfully!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        toast.success("Comment deleted successfully!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments!");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/likecomment/${commentId}`, {
        userId: user._id,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes }
              : c
          )
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments!");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/dislikecomment/${commentId}`, {
        userId: user._id,
      });
      if (res.data.deleted) {
        toast.info("Comment automatically removed due to 2 dislikes.");
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes }
              : c
          )
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTranslate = async (commentId: string, text: string, targetLang: string) => {
    if (!text) return;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        text
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = data[0].map((item: any) => item[0]).join("");
      setTranslatedComments((prev) => ({ ...prev, [commentId]: translated }));
      setTargetLanguages((prev) => ({ ...prev, [commentId]: targetLang }));
    } catch (err) {
      console.error("Translation error:", err);
      toast.error("Translation failed.");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4 border-b border-gray-100 dark:border-neutral-800 pb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                    {comment.cityName && ` • 📍 ${comment.cityName}`}
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-900 dark:text-neutral-100">
                      {translatedComments[comment._id] || comment.commentbody}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => handleLike(comment._id)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition ${
                          comment.likes?.includes(user?._id) ? "text-blue-500 font-semibold" : "text-gray-500"
                        }`}
                      >
                        👍 {comment.likes?.length || 0}
                      </button>
                      <button
                        onClick={() => handleDislike(comment._id)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition ${
                          comment.dislikes?.includes(user?._id) ? "text-red-500 font-semibold" : "text-gray-500"
                        }`}
                      >
                        👎 {comment.dislikes?.length || 0}
                      </button>
                      
                      <span className="text-xs text-gray-300 dark:text-neutral-700">|</span>
                      
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleTranslate(comment._id, comment.commentbody, e.target.value);
                            }
                          }}
                          value={targetLanguages[comment._id] || ""}
                          className="text-xs bg-transparent border rounded px-1.5 py-0.5 border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-gray-400 focus:outline-none"
                        >
                          <option value="">Translate</option>
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="hi">Hindi</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="zh">Chinese</option>
                        </select>
                        {translatedComments[comment._id] && (
                          <button
                            onClick={() => {
                              setTranslatedComments((prev) => {
                                const copy = { ...prev };
                                delete copy[comment._id];
                                return copy;
                              });
                              setTargetLanguages((prev) => {
                                const copy = { ...prev };
                                delete copy[comment._id];
                                return copy;
                              });
                            }}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Show Original
                          </button>
                        )}
                      </div>
                    </div>

                    {comment.userid === user?._id && (
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <button onClick={() => handleEdit(comment)} className="hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(comment._id)} className="hover:underline text-red-500">
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
