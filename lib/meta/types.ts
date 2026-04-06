export type MetaGraphPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  } | null;
};

export type MetaAccountRow = {
  id: string;
  user_id: string;
  facebook_user_id: string | null;
  user_access_token: string;
  token_expires_at: string | null;
  selected_page_id: string | null;
  selected_page_name: string | null;
  page_access_token: string | null;
  instagram_account_id: string | null;
  instagram_username: string | null;
  created_at: string;
  updated_at: string;
};
