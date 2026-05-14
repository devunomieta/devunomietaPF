'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function savePost(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const content = formData.get('content') as string
  const is_published = formData.get('is_published') === 'on'
  const is_pinned = formData.get('is_pinned') === 'on'
  const post_type = formData.get('post_type') as string || 'markdown'

  // Calculate read time
  const wordCount = content.trim().split(/\s+/).length;
  const read_time = Math.max(1, Math.ceil(wordCount / 200));

  let audio_url = formData.get('existing_audio_url') as string || null;
  let pdf_url = formData.get('existing_pdf_url') as string || null;
  let cover_image_url = formData.get('existing_cover_image_url') as string || null;
  
  const audioFile = formData.get('audio_file') as File | null;
  const pdfFile = formData.get('pdf_file') as File | null;
  const coverFile = formData.get('cover_image_file') as File | null;

  // Supabase Storage Uploads
  if (audioFile && audioFile.size > 0) {
    const fileExt = audioFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { data, error } = await supabase.storage.from('media').upload(`audio/${fileName}`, audioFile)
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(`audio/${fileName}`)
      audio_url = urlData.publicUrl
    }
  }

  if (pdfFile && pdfFile.size > 0) {
    const fileExt = pdfFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { data, error } = await supabase.storage.from('media').upload(`pdf/${fileName}`, pdfFile)
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(`pdf/${fileName}`)
      pdf_url = urlData.publicUrl
    }
  }

  if (coverFile && coverFile.size > 0) {
    const fileExt = coverFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const { data, error } = await supabase.storage.from('media').upload(`covers/${fileName}`, coverFile)
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(`covers/${fileName}`)
      cover_image_url = urlData.publicUrl
    }
  }

  const postData = {
    title,
    slug,
    content,
    is_published,
    post_type,
    audio_url,
    pdf_url,
    cover_image_url,
    read_time,
    is_pinned,
    updated_at: new Date().toISOString()
  }

  let error = null
  let createdPost = null

  if (id) {
    const { error: updateError } = await supabase.from('posts').update(postData).eq('id', id)
    error = updateError
  } else {
    const { data: newPost, error: insertError } = await supabase.from('posts').insert([postData]).select('id, title, slug').single()
    error = insertError
    createdPost = newPost
    
    // Automatic Notification for New Published Posts (Sitewide Announcement update)
    if (!error && is_published && createdPost) {
      try {
        const adminDb = createAdminClient()
        await Promise.all([
          adminDb.from('site_settings').upsert({ key: 'announcement_enabled', value: 'true' }, { onConflict: 'key' }),
          adminDb.from('site_settings').upsert({ key: 'announcement_text', value: `📢 New Blog Post: ${createdPost.title}` }, { onConflict: 'key' }),
          adminDb.from('site_settings').upsert({ key: 'announcement_link', value: `/blog/${createdPost.slug}` }, { onConflict: 'key' }),
        ])
      } catch (announceErr) {
        console.error('Failed to auto-publish sitewide announcement for new post:', announceErr)
      }
    }
  }

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/blog')
  revalidatePath('/manage/posts')
  
  return {
    success: true,
    post: {
      id: id || (createdPost ? createdPost.id : null),
      title: postData.title,
      slug: slug || (createdPost ? createdPost.slug : null),
      is_published: postData.is_published
    }
  }
}

/**
 * Dedicated Server Action for broadcasting a blog post update.
 * Decoupled to prevent UI timeouts, parallelized, and uses a fully responsive Dark/Light mode HTML email template.
 */
export async function broadcastPostAction(postId: string) {
  const supabase = await createClient()
  const adminDb = createAdminClient()

  // 1. Retrieve Committed Post Details
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('title, content, slug, cover_image_url')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return { success: false, error: 'Post record not found in database' }
  }

  // 2. Gather Subscriber Audience safely with fallback
  let { data: subscribers, error: subError } = await adminDb
    .from('subscribers')
    .select('email, name')
    .eq('status', 'active')

  if (subError || !subscribers || subscribers.length === 0) {
    const { data: allSubs } = await adminDb.from('subscribers').select('email, name')
    subscribers = allSubs
  }

  if (!subscribers || subscribers.length === 0) {
    return { success: false, error: 'No registered active subscribers found to notify.' }
  }

  // 3. Strip markdown to generate a clean textual snippet for email bodies
  const cleanSnippet = post.content
    ? post.content
        .replace(/[#*_`\[\]()]/g, '')
        .replace(/\n+/g, ' ')
        .substring(0, 220)
        .trim() + '...'
    : `Read the latest publication "${post.title}" directly on our personal Digital Library portal.`

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.devunomieta.xyz'
  const { sendEmail } = await import('@/lib/brevo')

  // 4. Define Fully Responsive High-Contrast Dark/Light HTML email Generator
  const generateHtml = (subName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title}</title>
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f8fafc;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #f8fafc;
      padding: 32px 12px;
    }
    .card {
      background-color: #ffffff;
      max-width: 580px;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.06);
      border: 1px solid #e2e8f0;
    }
    .logo-header {
      padding: 28px 24px 24px;
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
    }
    .logo-link {
      font-size: 15px;
      font-weight: 700;
      color: #2563eb !important;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-decoration: none;
    }
    .cover-pic {
      width: 100% !important;
      height: auto !important;
      display: block;
      max-height: 290px;
      object-fit: cover;
    }
    .content-wrap {
      padding: 32px 32px 40px;
    }
    .tagline {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .post-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a !important;
      line-height: 1.25;
      margin: 0 0 16px;
    }
    .post-intro {
      font-size: 16px;
      line-height: 1.6;
      color: #475569 !important;
      margin: 0 0 32px;
    }
    .action-deck {
      text-align: center;
      margin: 10px 0;
    }
    .cta-btn {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
      transition: all 200ms ease;
    }
    .footer-wrap {
      padding: 28px 24px;
      text-align: center;
      font-size: 12px;
      line-height: 1.6;
      color: #64748b;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .footer-wrap p { margin: 4px 0; }

    /* Dynamic Premium CSS Dark Mode Overrides */
    @media (prefers-color-scheme: dark) {
      body, .wrapper {
        background-color: #0f172a !important;
      }
      .card {
        background-color: #1e293b !important;
        border-color: #334155 !important;
      }
      .logo-header, .footer-wrap {
        border-color: #334155 !important;
      }
      .logo-link {
        color: #60a5fa !important;
      }
      .tagline {
        color: #94a3b8 !important;
      }
      .post-title {
        color: #f8fafc !important;
      }
      .post-intro {
        color: #cbd5e1 !important;
      }
      .cta-btn {
        background-color: #3b82f6 !important;
      }
      .footer-wrap {
        background-color: #0f172a !important;
        color: #475569 !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo-header">
        <a href="${baseUrl}" class="logo-link" target="_blank">Digital Library</a>
      </div>
      ${post.cover_image_url ? `<img src="${post.cover_image_url}" alt="${post.title}" class="cover-pic" width="580">` : ''}
      <div class="content-wrap">
        <div class="tagline">Hey ${subName || 'Reader'}, new release:</div>
        <h1 class="post-title">${post.title}</h1>
        <p class="post-intro">${cleanSnippet}</p>
        <div class="action-deck">
          <a href="${baseUrl}/blog/${post.slug}" class="cta-btn" target="_blank">Open Reading Link</a>
        </div>
      </div>
      <div class="footer-wrap">
        <p>Published with care on Dev-Unomieta's Official Library.</p>
        <p>You received this notification because you subscribed to Joseph Unomieta's publication loop.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // 5. Dispatch Batching
  const BATCH_SIZE = 8
  let sentCounter = 0

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          const result = await sendEmail({
            to: [{ email: subscriber.email, name: subscriber.name }],
            subject: `New Post: ${post.title}`,
            htmlContent: generateHtml(subscriber.name),
          })
          if (result && result.success) {
            sentCounter++
          }
        } catch (err) {
          console.error(`Mail Broadcast failure for ${subscriber.email}:`, err)
        }
      })
    )
    // Cool down between batches to prevent Brevo throttling
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }

  return {
    success: true,
    sentCount: sentCounter,
  }
}

export async function deletePost(id: string) {
  const supabase = await createClient()
  await supabase.from('posts').delete().eq('id', id)
  revalidatePath('/blog')
  revalidatePath('/manage/posts')
}
