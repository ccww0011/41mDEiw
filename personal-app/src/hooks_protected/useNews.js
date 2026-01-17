import {logout} from "@/hooks_protected/useAuth";

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

export async function useNews() {
  try {
    let url = process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/news";
    let content = {
      method: "GET",
      headers: { 'content-type': 'application/json' },
      credentials: "include",
    };
    const response = await fetch(url, content);
    const items = await response.json();
    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/html')) {
        return {message: "Unauthorised.", status: 'Unauthorised'};
      } else {
        console.log(items);
        const decodedItems = items.map(item => ({
          ...item,
          title: item.title.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m => ENTITIES[m])
        }));
        return {data: decodedItems, message: items.message, status: 'Success'};
      }
    } else if (response.status === 401 || response.status === 403) {
      logout();
      return {message: "Unauthorised.", status: 'Unauthorised'};
    } else {
      return {message: items.message, status: 'Error'};
    }
  } catch (error) {
    return {message: error.message, status: 'Error'};
  }
}
