// src/graphql/schema.js
const { gql } = require('apollo-server-express');
const { DateTimeResolver, JSONResolver } = require('graphql-scalars');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # User Types
  type User {
    id: ID!
    email: String!
    fullName: String
    avatar: String
    isActive: Boolean!
    isAdmin: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime
    blogs: [Blog]
  }

  type AuthPayload {
    token: String!
    user: User!
    success: Boolean!
    message: String
  }

  # Blog Types
  type Blog {
    id: ID!
    title: String!
    slug: String!
    content: String!
    excerpt: String
    featuredImage: String
    metaTitle: String
    metaDescription: String
    published: Boolean!
    publishedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    tags: [String!]!
    author: User!
    authorId: ID!
  }

  # Service Types
  type Service {
    id: ID!
    title: String!
    slug: String!
    description: String
    icon: String
    content: String
    price: String
    isActive: Boolean!
    orderIndex: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # About Us
  type AboutUs {
    id: ID!
    title: String!
    mission: String
    vision: String
    history: String
    teamMembers: JSON
    values: String
    updatedAt: DateTime!
  }

  # Contact Types
  type Contact {
    id: ID!
    name: String!
    email: String!
    phone: String
    subject: String
    message: String!
    isRead: Boolean!
    createdAt: DateTime!
  }

  # Policy Types
  type Policy {
    id: ID!
    type: String!
    title: String!
    content: String!
    version: String!
    effectiveDate: DateTime!
    isActive: Boolean!
    updatedAt: DateTime!
  }

  # Subscriber Types
  type Subscriber {
    id: ID!
    email: String!
    fullName: String
    isActive: Boolean!
    confirmed: Boolean!
    subscribedAt: DateTime!
    blogs: [Blog!]!
  }

  # Email Campaign Types
  type EmailCampaign {
    id: ID!
    subject: String!
    content: String!
    template: String!
    status: String!
    sentAt: DateTime
    recipientCount: Int!
    openCount: Int!
    clickCount: Int!
    createdAt: DateTime!
    blog: Blog
  }

  # Response Types
  type MutationResponse {
    success: Boolean!
    message: String!
    id: ID
  }

  # Inputs
  input SignUpInput {
    email: String!
    password: String!
    fullName: String
  }

  input SignInInput {
    email: String!
    password: String!
  }

  input BlogInput {
    title: String!
    content: String!
    excerpt: String
    featuredImage: String
    metaTitle: String
    metaDescription: String
    published: Boolean
    tags: [String!]
  }

  input ServiceInput {
    title: String!
    description: String
    icon: String
    content: String
    price: String
    isActive: Boolean
    orderIndex: Int
  }

  input AboutUsInput {
    title: String!
    mission: String
    vision: String
    history: String
    teamMembers: JSON
    values: String
  }

  input ContactInput {
    name: String!
    email: String!
    phone: String
    subject: String
    message: String!
  }

  input PolicyInput {
    type: String!
    title: String!
    content: String!
    version: String
    effectiveDate: DateTime
  }

  input SubscriberInput {
    email: String!
    fullName: String
    blogIds: [ID!]
  }

  # Queries
  type Query {
    # Auth
    me: User
    
    # Users (Admin only)
    users: [User!]!
    
    # Blogs
    blogs(publishedOnly: Boolean = true, limit: Int = 20, offset: Int = 0): [Blog!]!
    blog(id: ID, slug: String): Blog
    
    # Services
    services(activeOnly: Boolean = true): [Service!]!
    service(id: ID, slug: String): Service
    
    # About Us
    aboutUs: AboutUs
    
    # Contacts (Admin only)
    contacts(unreadOnly: Boolean, limit: Int = 50): [Contact!]!
    contact(id: ID!): Contact
    
    # Policies
    policies(type: String): [Policy!]!
    policy(type: String!): Policy
    
    # Subscribers (Admin only)
    subscribers(activeOnly: Boolean = true): [Subscriber!]!
    
    # Campaigns (Admin only)
    campaigns(limit: Int = 20): [EmailCampaign!]!
  }

  # Mutations
  type Mutation {
    # Auth
    signUp(input: SignUpInput!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
    
    # Blog CRUD
    createBlog(input: BlogInput!): Blog!
    updateBlog(id: ID!, input: BlogInput!): Blog!
    deleteBlog(id: ID!): MutationResponse!
    
    # Service CRUD
    createService(input: ServiceInput!): Service!
    updateService(id: ID!, input: ServiceInput!): Service!
    deleteService(id: ID!): MutationResponse!
    
    # About Us
    updateAboutUs(input: AboutUsInput!): AboutUs!
    
    # Contact
    createContact(input: ContactInput!): Contact!
    markContactRead(id: ID!, read: Boolean!): Contact!
    deleteContact(id: ID!): MutationResponse!
    
    # Policy CRUD
    createPolicy(input: PolicyInput!): Policy!
    updatePolicy(id: ID!, input: PolicyInput!): Policy!
    deletePolicy(id: ID!): MutationResponse!
    
    # Email Marketing
    subscribe(input: SubscriberInput!): MutationResponse!
    unsubscribe(email: String!): MutationResponse!
    sendMarketingEmail(subject: String!, content: String!, blogId: ID, sendToAll: Boolean = true, specificEmails: [String!]): MutationResponse!
    confirmSubscription(token: String!): MutationResponse!
  }
`;

module.exports = typeDefs;