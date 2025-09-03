export async function getPrice(data) {
  try {
    console.log(data);

    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + '/price/get', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: "include",
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
