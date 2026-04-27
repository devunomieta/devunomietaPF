import { PostEditor } from '../PostEditor'

export default function NewPostPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground">Create New Post</h1>
        <p className="text-sm text-muted mt-1">Write your new discussion post using Markdown.</p>
      </div>
      
      <PostEditor />
    </div>
  )
}
