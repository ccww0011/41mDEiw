"use client";

import { useEffect, useState } from "react";
import { postContactUs } from "@/hooks/useContact";
import { useAuth } from "@/context/AuthContext";
import { useRecaptcha } from "@/hooks/useRecaptcha";

export default function ContactUs() {
  const { user } = useAuth();
  const { ready, execute } = useRecaptcha('contact_us');

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const [message, setMessage] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user && user.email) {
      setContact(user.email);
    }
  }, [user]);

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!name || !contact || !message) {
      setMsg('All fields are required.');
      return;
    }
    if (!ready) {
      setMsg('reCAPTCHA not ready. Please try again.');
      return;
    }

    setMsg('Submitting...');

    const recaptchaToken = await execute();
    if (!recaptchaToken) {
      setMsg('Authentication server busy. Please try again.');
      return;
    }
    const { serverMsg, success } = await postContactUs({name, contact, message, recaptchaToken});
    setMsg(serverMsg);
    setSuccess(success);
  }

  return (
    <>
      <div className="container">
        <div className="grid">
          <div className="grid-item grid10">
            <h2>Contact Us</h2>
          </div>
        </div>

        {success ?
          <p style={{color: "green"}}>You have submitted the form. Thank you for contacting us.</p>
          : <form onSubmit={handleSubmit}>
            <div className="grid">
              <div className="grid-item grid3">
                <p>Name:</p>
              </div>
              <div className="grid-item grid7">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid-item grid10" style={{padding: '5px 0'}}></div>

              <div className="grid-item grid3">
                <p>Contact (Email/ Mobile):</p>
              </div>
              <div className="grid-item grid7">
                <input
                  type="text"
                  id="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
              </div>

              <div className="grid-item grid10" style={{padding: '5px 0'}}></div>

              <div className="grid-item grid3">
                <p>Message:</p>
              </div>
              <div className="grid-item grid7">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  style={{resize: 'vertical'}}
                />
              </div>

              {msg && <p style={{color: 'red'}}>{msg}</p>}

              <div className="grid-item grid10" style={{padding: '5px 0'}}></div>

              <div className="grid-item grid3"></div>
              <div className="grid-item grid4">
                <button className="button-long">Submit</button>
              </div>
              <div className="grid-item grid3"></div>
            </div>
          </form>
        }

        <div className="grid">
          <div className="grid-item grid10">
            <p></p>
            <p></p>
            <p></p>
            <p>Once submitted, we will be notified through email once per day. </p>
            <p>------------------------------------------</p>
            <h4>Alternatively, you may call me.</h4>
          </div>
        </div>
      </div>
    </>
  );
}
