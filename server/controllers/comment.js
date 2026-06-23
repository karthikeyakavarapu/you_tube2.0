import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  const { commentbody } = commentdata;

  // Block comment if it contains special characters
  const hasSpecialChar = /[~`@#$%\^&*_+=\[\]{}|\\<>]/g.test(commentbody);
  if (hasSpecialChar) {
    return res.status(400).json({ message: "Comment blocked: contains special characters." });
  }

  const postcomment = new comment(commentdata);
  try {
    await postcomment.save();
    return res.status(200).json({ comment: true, data: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) return res.status(404).send("Comment not found");

    let likes = targetComment.likes || [];
    let dislikes = targetComment.dislikes || [];

    if (likes.includes(userId)) {
      likes = likes.filter((uid) => uid !== userId);
    } else {
      likes.push(userId);
      dislikes = dislikes.filter((uid) => uid !== userId);
    }

    const updated = await comment.findByIdAndUpdate(
      id,
      { $set: { likes, dislikes } },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) return res.status(404).send("Comment not found");

    let likes = targetComment.likes || [];
    let dislikes = targetComment.dislikes || [];

    if (dislikes.includes(userId)) {
      dislikes = dislikes.filter((uid) => uid !== userId);
    } else {
      dislikes.push(userId);
      likes = likes.filter((uid) => uid !== userId);
    }

    if (dislikes.length >= 2) {
      await comment.findByIdAndDelete(id);
      return res.status(200).json({ deleted: true });
    }

    const updated = await comment.findByIdAndUpdate(
      id,
      { $set: { likes, dislikes } },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
