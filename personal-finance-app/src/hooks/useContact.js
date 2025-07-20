"use client";

async function ContactUsApi(body = null) {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/contactUs", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/html')) {
        return {serverMsg: "Failed to submit the form. Please email us or try again.", success: false};
      } else {
        return {serverMsg: "Thank you for your message! We will get back to you soon.", success: true};
      }
    } else {
      return {serverMsg: "Failed to submit the form. Please email us or try again.", success: false};
    }
  } catch (error) {
    return {serverMsg: "Failed to submit the form. Please email us or try again.", success: false};
  }
}

export async function postContactUs(body) {
  return await ContactUsApi(body);
}