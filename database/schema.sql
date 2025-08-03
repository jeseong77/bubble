-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Updated based on current Supabase state as of 2025-08-03

-- Core user table
CREATE TABLE public.users (
  id uuid NOT NULL,
  phone_number text UNIQUE,
  first_name text,
  last_name text,
  birth_date date,
  height_cm integer,
  mbti text,
  gender text,
  preferred_gender text,
  bio text,
  location USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  profile_setup_completed boolean NOT NULL DEFAULT false,
  active_group_id uuid NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Groups table for bubble formation
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid,
  max_size integer NOT NULL CHECK (max_size = ANY (ARRAY[2, 3, 4])),
  status text NOT NULL DEFAULT 'forming'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text,
  group_gender text CHECK (group_gender = ANY (ARRAY['male'::text, 'female'::text, 'mixed'::text])),
  preferred_gender text CHECK (preferred_gender = ANY (ARRAY['male'::text, 'female'::text, 'any'::text])),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id)
);

-- Add foreign key for users.active_group_id
ALTER TABLE public.users ADD CONSTRAINT users_active_group_id_fkey 
  FOREIGN KEY (active_group_id) REFERENCES public.groups(id);

-- Group membership tracking
CREATE TABLE public.group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'invited'::text,
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

-- Likes between groups (renamed from group_likes)
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_group_id uuid NOT NULL,
  to_group_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_from_group_id_fkey FOREIGN KEY (from_group_id) REFERENCES public.groups(id),
  CONSTRAINT likes_to_group_id_fkey FOREIGN KEY (to_group_id) REFERENCES public.groups(id)
);

-- Matches when two groups like each other
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_1_id uuid NOT NULL,
  group_2_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_group_1_id_fkey FOREIGN KEY (group_1_id) REFERENCES public.groups(id),
  CONSTRAINT matches_group_2_id_fkey FOREIGN KEY (group_2_id) REFERENCES public.groups(id)
);

-- Chat rooms for each match
CREATE TABLE public.chat_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT chat_rooms_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  room_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  message_type text DEFAULT 'text'::text,
  edited_at timestamp with time zone,
  reply_to_id bigint,
  delivered_at timestamp with time zone,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id),
  CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id)
);

-- Message read status tracking
CREATE TABLE public.message_read_status (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  message_id bigint NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_read_status_pkey PRIMARY KEY (id),
  CONSTRAINT message_read_status_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id),
  CONSTRAINT message_read_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT message_read_status_unique UNIQUE (message_id, user_id)
);

-- User profile images
CREATE TABLE public.user_images (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_images_pkey PRIMARY KEY (id),
  CONSTRAINT user_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- PostGIS spatial reference system (if using location features)
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);

-- Key RPC Functions for Chat System:
-- 1. get_my_matches_enhanced() - Returns enhanced match data with chat room info
-- 2. get_chat_messages(p_room_id, p_limit, p_offset) - Retrieves chat messages
-- 3. send_message(p_room_id, p_content, p_message_type, p_reply_to_id) - Sends messages
-- 4. mark_messages_as_read(p_room_id) - Marks messages as read
-- 5. get_unread_count(p_room_id) - Gets unread message count