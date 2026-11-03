/**
 * Sigmazam Threads API Publisher
 * Publishes text and image posts autonomously to @sigmazam.app via official Meta Threads API.
 */

interface PublishTextOptions {
  text: string;
  accessToken?: string;
}

interface PublishImageOptions {
  text: string;
  imageUrl: string;
  accessToken?: string;
}

export async function publishToThreads(options: PublishTextOptions | PublishImageOptions) {
  const token = options.accessToken || process.env.THREADS_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      '[Threads Publisher] Missing THREADS_ACCESS_TOKEN. Please set THREADS_ACCESS_TOKEN in environment or .env file.'
    );
  }

  const isImage = 'imageUrl' in options && Boolean(options.imageUrl);
  const mediaType = isImage ? 'IMAGE' : 'TEXT';

  console.log(`[Threads Publisher] Creating media container (${mediaType})...`);

  const containerParams = new URLSearchParams({
    media_type: mediaType,
    text: options.text,
    access_token: token,
  });

  if (isImage && 'imageUrl' in options) {
    containerParams.append('image_url', options.imageUrl);
  }

  // Step 1: Create Container
  const createRes = await fetch('https://graph.threads.net/v1.0/me/threads', {
    method: 'POST',
    body: containerParams,
  });

  const createData = (await createRes.json()) as { id?: string; error?: { message: string } };

  if (!createRes.ok || !createData.id) {
    throw new Error(
      `[Threads Publisher] Failed to create container: ${createData.error?.message || JSON.stringify(createData)}`
    );
  }

  const creationId = createData.id;
  console.log(`[Threads Publisher] Container created with ID: ${creationId}`);

  // Step 2: Publish Container
  console.log('[Threads Publisher] Publishing container...');
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: token,
  });

  const publishRes = await fetch('https://graph.threads.net/v1.0/me/threads_publish', {
    method: 'POST',
    body: publishParams,
  });

  const publishData = (await publishRes.json()) as { id?: string; error?: { message: string } };

  if (!publishRes.ok || !publishData.id) {
    throw new Error(
      `[Threads Publisher] Failed to publish container: ${publishData.error?.message || JSON.stringify(publishData)}`
    );
  }

  console.log(`[Threads Publisher] Successfully published! Thread ID: ${publishData.id}`);
  return {
    success: true,
    threadId: publishData.id,
    url: `https://www.threads.net/@sigmazam.app/post/${publishData.id}`,
  };
}

// Standalone CLI runner
if (process.argv[1]?.includes('threads-poster')) {
  const sampleText = process.argv[2] || 'pov: your 191cm bodyguard pulled you back at 3 AM. 🖤 #sigmazam #otome';
  publishToThreads({ text: sampleText })
    .then((res) => console.log('Result:', res))
    .catch((err) => console.error(err.message));
}

