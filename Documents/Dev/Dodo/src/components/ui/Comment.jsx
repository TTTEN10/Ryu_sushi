import Avatar from './Avatar'

export default function Comment({
  author,
  avatar,
  date,
  content,
  replies = [],
  onReply,
  onLike,
  likes = 0,
}) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [liked, setLiked] = useState(false)

  const handleLike = () => {
    setLiked(!liked)
    onLike?.()
  }

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply?.(replyText)
      setReplyText('')
      setIsReplying(false)
    }
  }

  return (
    <div className="comment">
      <div className="comment-header">
        <Avatar src={avatar} fallback={author?.[0]} size="sm" />
        <div className="comment-meta">
          <span className="comment-author">{author}</span>
          <span className="comment-date">{date}</span>
        </div>
      </div>
      <div className="comment-content">
        <p>{content}</p>
      </div>
      <div className="comment-actions">
        <button
          className={`comment-action ${liked ? 'active' : ''}`}
          onClick={handleLike}
        >
          ♥ {likes + (liked ? 1 : 0)}
        </button>
        <button
          className="comment-action"
          onClick={() => setIsReplying(!isReplying)}
        >
          💬 Répondre
        </button>
      </div>
      {isReplying && (
        <div className="comment-reply-form">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Écrire une réponse..."
            rows={3}
            className="comment-textarea"
          />
          <div className="comment-reply-actions">
            <button onClick={() => setIsReplying(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={handleSubmitReply} className="btn btn-primary">
              Répondre
            </button>
          </div>
        </div>
      )}
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply, index) => (
            <Comment key={index} {...reply} />
          ))}
        </div>
      )}
    </div>
  )
}