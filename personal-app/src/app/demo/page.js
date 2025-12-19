"use client";

import HorizontalScrollerWithButtons from "@/components/HorizontalScrollerWithButtons";

export default function Demo() {

  const projects = [
    {
      imageSrc: "/Personal.jpg",
      title: 'This Website',
      description: 'A simple full-stack web application for all corporations',
      features: [
        'A contact us function which notifies owners once per day via a cloud scheduler',
        'Restricted resources that requires authentication with credentials and authorisation with cookies',
        'Access to database with basic create, read, update, and delete',
        'Used Serverless Functions on backend, NoSQL database, OAuth2 and httpOnly cookies'
      ]
    },
    {
      imageSrc: "/EqualPay.jpg",
      title: 'Equal Pay Website',
      description: 'A web application for data analysis and visualisation',
      features: [
        'Used agile software development methodology',
        'Implemented continuous deployment practices for frequent updates',
        'Analysed and documented business requirements with stakeholders',
        'Deployed application on cloud',
        'Used Serverless Functions on backend, MySQL database, Google Maps API'
      ]
    },
    {
      imageSrc: "/ImageStorage.jpg",
      title: 'Serverless Image Storage System',
      description: 'A cloud-based AI image recognition and storage system',
      features: [
        'Deployed automatic image recognition with OpenCV',
        'Object tagging use cases – crowd management, traffic management, physical access security',
        'Customised API interface for 3rd party integration',
        'AWS based solution – Lambda, S3, NoSQL'
      ]
    },
    {
      imageSrc: "/Android.jpg",
      title: 'Carbon Footprint Mobile App',
      description: 'A simple tool to calculate carbon footprint',
      features: [
        'Kept track of electricity and gas usage for household',
        'Translated these usage with carbon footprint',
        'Deployed as an android application'
      ]
    },
    {
      imageSrc: "/InfoSystem.jpg",
      title: 'Web-based ERP/CRM systems',
      description: 'JavaEE based web application',
      features: [
        'Automated information management systems',
        '3-tier architecture – Web, Business and EIS',
        'Access to database with basic create, read, update, and delete functions'
      ]
    }
  ];

  return (
    <>
      <div className="container">
        <h2>Expertise and Cases</h2>
        <div className="grid">
          <div className="grid-item grid6" style={{border: "10px #ffffff", backgroundColor: "#deebf7", padding: "0 10px"}}>
            <h3>Technological Solutions tailored to Business Needs</h3>
            <p>Creating efficient, automated systems that align with your business goals.</p>
            <p>Designing resilient and cost effective solutions that simplify complex tasks.</p>
            <p>Developing custom-built websites and databases suitable to your organisation.</p>
            <p></p>
          </div>

          <div className="grid-item grid6" style={{border: "10px #ffffff", backgroundColor: "#deebf7", padding: "0 10px"}}>
            <h3>Streamlining Processes</h3>
            <p>Assessing current business processes and identifying areas for improvement.</p>
            <p>Automating routine tasks to help organisation focus on what matters most.</p>
            <p>Analyzing trends, creating reports, and generating insights to guide business decisions.</p>
            <p></p>
          </div>
        </div>
        <HorizontalScrollerWithButtons items={projects} />
      </div>

    </>
  );
}