CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;


postgres://enzogevzzczgmc:c233287879ba092797f73375c58351334b1d969662671180df4e4739c541d2a5@ec2-79-125-6-160.eu-west-1.compute.amazonaws.com:5432/dc0fal1f7fb9fk
