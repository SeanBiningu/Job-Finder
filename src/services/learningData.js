import { requireSupabase } from './supabase';

export const saveLearningProject = async ({ title, idea, field, skills }) => {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Please sign in before saving a project.');
  const { error } = await client.from('learning_projects').upsert({ candidate_id: user.id, title, idea, field, skills });
  if (error) throw error;
};

export const saveSprint = async ({ field, prompt, note }) => {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Please sign in before saving a sprint.');
  const { error } = await client.from('learning_sprints').insert({ candidate_id: user.id, field, prompt, note });
  if (error) throw error;
};

export const joinLearningRoom = async ({ field, goal, skills }) => {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Please sign in before joining a room.');
  const { data: room, error: roomError } = await client.from('learning_rooms').upsert({ field, title: `${field} makers room` }, { onConflict: 'field' }).select('id').single();
  if (roomError) throw roomError;
  const { error } = await client.from('learning_room_members').upsert({ room_id: room.id, candidate_id: user.id, goal, skills });
  if (error) throw error;
};
