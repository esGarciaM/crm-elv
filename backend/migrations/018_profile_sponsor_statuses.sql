CREATE TABLE IF NOT EXISTS profile_sponsor_statuses (
    profile_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    sponsor_status_id INTEGER NOT NULL REFERENCES sponsor_statuses(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, sponsor_status_id)
);
