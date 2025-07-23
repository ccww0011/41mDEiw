export async function postCsvRows(data) {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + '/portfolio/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.status === 500) {
      return { status: 'Busy', message: 'Server busy. Try again later.' };
    }

    if (response.ok) {
      return { status: 'Success', message: 'Upload successful!' };
    }

    return { status: 'Error', message: 'Upload failed.' };
  } catch (err) {
    return { status: 'Error', message: 'Upload failed.' };
  }
}
