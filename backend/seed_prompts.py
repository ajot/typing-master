"""
Seed script to populate the database with DigitalOcean-themed typing prompts.
Run this after setting up the database: python seed_prompts.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from models import db, Prompt

PROMPTS = [
    # Droplets
    {
        "text": "Droplets are scalable virtual machines that launch in seconds. Deploy your application on DigitalOcean and scale with confidence.",
        "category": "droplets",
        "difficulty": "medium"
    },
    {
        "text": "Spin up a Droplet in just 55 seconds. Choose from multiple Linux distributions or deploy your own custom image.",
        "category": "droplets",
        "difficulty": "easy"
    },
    {
        "text": "DigitalOcean Droplets offer predictable pricing with no surprise bills. Start with basic plans and scale as you grow.",
        "category": "droplets",
        "difficulty": "medium"
    },

    # Kubernetes
    {
        "text": "Kubernetes simplifies container orchestration. DigitalOcean Kubernetes lets you deploy and manage containerized applications effortlessly.",
        "category": "kubernetes",
        "difficulty": "medium"
    },
    {
        "text": "Deploy a managed Kubernetes cluster in minutes. Focus on building apps while we handle the infrastructure complexity.",
        "category": "kubernetes",
        "difficulty": "easy"
    },
    {
        "text": "Scale your containers automatically with Kubernetes autoscaling. Handle traffic spikes without manual intervention.",
        "category": "kubernetes",
        "difficulty": "medium"
    },

    # App Platform
    {
        "text": "App Platform is a fully managed solution. Push your code and let DigitalOcean handle the infrastructure, scaling, and security.",
        "category": "app-platform",
        "difficulty": "medium"
    },
    {
        "text": "Deploy from GitHub with automatic builds. Every push triggers a new deployment keeping your app always up to date.",
        "category": "app-platform",
        "difficulty": "easy"
    },
    {
        "text": "App Platform supports Node.js, Python, Go, Ruby, PHP, and static sites. Deploy your favorite framework with zero configuration.",
        "category": "app-platform",
        "difficulty": "medium"
    },

    # Managed Databases
    {
        "text": "Managed databases remove operational burden. Focus on your application while DigitalOcean handles backups, updates, and failover.",
        "category": "databases",
        "difficulty": "medium"
    },
    {
        "text": "Choose from PostgreSQL, MySQL, Redis, or MongoDB. All managed databases include automated backups and point-in-time recovery.",
        "category": "databases",
        "difficulty": "medium"
    },
    {
        "text": "Database clusters provide high availability with automatic failover. Your data stays safe even when hardware fails.",
        "category": "databases",
        "difficulty": "medium"
    },

    # Spaces Object Storage
    {
        "text": "Spaces object storage is S3-compatible. Store and serve large amounts of data with built-in CDN for fast global delivery.",
        "category": "spaces",
        "difficulty": "medium"
    },
    {
        "text": "Store images, videos, and backups in Spaces. Pay only for what you use with simple predictable pricing.",
        "category": "spaces",
        "difficulty": "easy"
    },

    # General Cloud
    {
        "text": "The cloud is not just someone elses computer. It is a global network of data centers working together to serve your users.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "text": "Infrastructure as code lets you version control your servers. Reproducible deployments reduce errors and speed up recovery.",
        "category": "general",
        "difficulty": "medium"
    },
    {
        "text": "Continuous integration and continuous deployment automate your workflow. Ship features faster with confidence.",
        "category": "general",
        "difficulty": "medium"
    },
    {
        "text": "Load balancers distribute traffic across multiple servers. High availability means your app stays online even during failures.",
        "category": "general",
        "difficulty": "medium"
    },
    {
        "text": "Monitoring and alerting help you catch problems before users do. Set up dashboards and get notified when metrics cross thresholds.",
        "category": "general",
        "difficulty": "medium"
    },
    {
        "text": "Virtual private clouds isolate your resources from other users. Network security starts with proper isolation and firewall rules.",
        "category": "general",
        "difficulty": "medium"
    },

    # Developer Experience
    {
        "text": "The best developers ship code daily. Modern cloud platforms remove friction so you can focus on building great products.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "text": "APIs power the modern web. RESTful services and GraphQL endpoints let applications communicate seamlessly across the internet.",
        "category": "general",
        "difficulty": "medium"
    },
    {
        "text": "Containers package your application with all its dependencies. Build once and run anywhere with consistent behavior.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "text": "Serverless functions run code without managing servers. Pay only for execution time and scale automatically to zero.",
        "category": "general",
        "difficulty": "medium"
    },
    {
        "text": "Git is the foundation of modern software development. Branch, commit, merge, and collaborate with developers worldwide.",
        "category": "general",
        "difficulty": "easy"
    },

    # Fun/Motivational
    {
        "text": "Every expert was once a beginner. Keep typing, keep learning, and watch your skills grow with every keystroke.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "text": "The command line is your superpower. Master the terminal and unlock the full potential of your development environment.",
        "category": "general",
        "difficulty": "easy"
    },
    {
        "text": "Debugging is like being a detective in a crime movie where you are also the murderer. Happy coding!",
        "category": "general",
        "difficulty": "easy"
    },
]


def seed_prompts():
    """Seed the database with prompts"""
    app = create_app()

    with app.app_context():
        # Check if prompts already exist
        existing_count = Prompt.query.count()
        if existing_count > 0:
            print(f"Database already has {existing_count} prompts.")
            response = input("Do you want to add more prompts anyway? (y/n): ")
            if response.lower() != 'y':
                print("Aborting seed.")
                return

        # Add prompts
        added = 0
        for prompt_data in PROMPTS:
            # Check if this exact text already exists
            existing = Prompt.query.filter_by(text=prompt_data['text']).first()
            if existing:
                print(f"Skipping duplicate: {prompt_data['text'][:50]}...")
                continue

            prompt = Prompt(
                text=prompt_data['text'],
                category=prompt_data['category'],
                difficulty=prompt_data['difficulty'],
                is_active=True
            )
            db.session.add(prompt)
            added += 1

        db.session.commit()
        print(f"Successfully added {added} prompts to the database!")
        print(f"Total prompts now: {Prompt.query.count()}")


if __name__ == '__main__':
    seed_prompts()
