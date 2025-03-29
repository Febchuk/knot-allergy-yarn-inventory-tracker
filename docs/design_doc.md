# Yarn Inventory Tracker - Technical Specification

## 1. Technology Stack

### 1.1 Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn UI (built on Radix UI primitives)
- **State Management**: React Context API + Hooks
- **Form Handling**: React Hook Form + Zod validation
- **Data Fetching**: React Query/TanStack Query
- **Charts**: Recharts or D3.js

### 1.2 Backend
- **Framework**: Next.js API Routes/Server Actions
- **Database**: Neon PostgreSQL (serverless, branching capabilities)
- **File Storage**: Cloudflare R2 (S3-compatible object storage)
- **Authentication**: NextAuth.js / Auth.js
- **ORM**: Prisma or Drizzle
- **API Type Safety**: tRPC (optional for full-stack type safety)

### 1.3 Deployment & Infrastructure
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + custom logging
- **Environment Variables**: Vercel Environment Variables

## 2. Database Schema

### 2.1 PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn weights reference table
CREATE TABLE yarn_weights (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color_code VARCHAR(20) NOT NULL
);

-- Yarn brands reference table
CREATE TABLE yarn_brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  website VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn inventory table
CREATE TABLE yarns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  brand_id INTEGER REFERENCES yarn_brands(id) ON DELETE SET NULL,
  
  -- Color management with dyeing tracking
  current_color VARCHAR(255) NOT NULL,
  planned_color VARCHAR(255),
  previous_color VARCHAR(255),
  color_code VARCHAR(20),
  
  -- Dyeing status tracking
  dyeing_status VARCHAR(50) NOT NULL DEFAULT 'not_to_be_dyed', -- Options: 'to_be_dyed', 'not_to_be_dyed', 'has_been_dyed'
  
  -- Craft type
  craft_type VARCHAR(50), -- 'knitting', 'crochet', 'both', or NULL if unspecified
  
  -- Other yarn details
  material TEXT,
  weight_id INTEGER REFERENCES yarn_weights(id) ON DELETE SET NULL,
  yards_per_oz VARCHAR(50),
  total_weight DECIMAL(10, 2),
  total_yards INTEGER,
  organization VARCHAR(100),
  notes TEXT,
  has_project BOOLEAN DEFAULT FALSE, -- Quick flag for project association
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn photos table
CREATE TABLE yarn_photos (
  id SERIAL PRIMARY KEY,
  yarn_id INTEGER REFERENCES yarns(id) ON DELETE CASCADE,
  r2_key VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  weight_id INTEGER REFERENCES yarn_weights(id) ON DELETE SET NULL,
  required_yardage INTEGER,
  required_weight DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, frogged
  notes TEXT,
  pattern_r2_key VARCHAR(255),
  pattern_filename VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn-Project association table (many-to-many)
CREATE TABLE yarn_projects (
  id SERIAL PRIMARY KEY,
  yarn_id INTEGER REFERENCES yarns(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  allocated_yards INTEGER,
  allocated_weight DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(yarn_id, project_id)
);

-- Project photos table
CREATE TABLE project_photos (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  r2_key VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Yarn-Tag association table
CREATE TABLE yarn_tags (
  id SERIAL PRIMARY KEY,
  yarn_id INTEGER REFERENCES yarns(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(yarn_id, tag_id)
);

-- Project-Tag association table
CREATE TABLE project_tags (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, tag_id)
);
```

### 2.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz
  
  yarns       Yarn[]
  projects    Project[]
  yarnBrands  YarnBrand[]
  tags        Tag[]

  @@map("users")
}

model YarnWeight {
  id          Int     @id
  name        String  @db.VarChar(100)
  description String?
  colorCode   String  @map("color_code") @db.VarChar(20)
  
  yarns       Yarn[]
  projects    Project[]

  @@map("yarn_weights")
}

model YarnBrand {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(255)
  website   String?
  userId    Int?     @map("user_id")
  isGlobal  Boolean  @default(false) @map("is_global")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  yarns     Yarn[]

  @@map("yarn_brands")
}

model Yarn {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  brandId     Int?      @map("brand_id")
  
  // Color management with dyeing tracking
  currentColor String    @map("current_color") @db.VarChar(255)
  plannedColor String?   @map("planned_color") @db.VarChar(255)
  previousColor String?  @map("previous_color") @db.VarChar(255)
  colorCode   String?    @map("color_code") @db.VarChar(20)
  
  // Dyeing status tracking
  dyeingStatus String    @default("not_to_be_dyed") @map("dyeing_status") @db.VarChar(50)
  
  // Craft type
  craftType   String?    @map("craft_type") @db.VarChar(50)
  
  // Other yarn details
  material    String?
  weightId    Int?      @map("weight_id")
  yardsPerOz  String?   @map("yards_per_oz") @db.VarChar(50)
  totalWeight Decimal?  @map("total_weight") @db.Decimal(10, 2)
  totalYards  Int?      @map("total_yards")
  organization String?  @db.VarChar(100)
  notes       String?
  hasProject  Boolean   @default(false) @map("has_project")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @default(now()) @map("updated_at") @db.Timestamptz
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  brand       YarnBrand? @relation(fields: [brandId], references: [id], onDelete: SetNull)
  weight      YarnWeight? @relation(fields: [weightId], references: [id], onDelete: SetNull)
  photos      YarnPhoto[]
  yarnProjects YarnProject[]
  tags        YarnTag[]

  @@map("yarns")
}

model YarnPhoto {
  id          Int       @id @default(autoincrement())
  yarnId      Int       @map("yarn_id")
  r2Key       String    @map("r2_key") @db.VarChar(255)
  filename    String    @db.VarChar(255)
  contentType String    @map("content_type") @db.VarChar(100)
  size        Int
  isPrimary   Boolean   @default(false) @map("is_primary")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  yarn        Yarn      @relation(fields: [yarnId], references: [id], onDelete: Cascade)

  @@map("yarn_photos")
}

model Project {
  id            Int       @id @default(autoincrement())
  userId        Int       @map("user_id")
  name          String    @db.VarChar(255)
  weightId      Int?      @map("weight_id")
  requiredYardage Int?    @map("required_yardage")
  requiredWeight Decimal? @map("required_weight") @db.Decimal(10, 2)
  status        String    @default("planned") @db.VarChar(50)
  notes         String?
  patternR2Key  String?   @map("pattern_r2_key") @db.VarChar(255)
  patternFilename String? @map("pattern_filename") @db.VarChar(255)
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime  @default(now()) @map("updated_at") @db.Timestamptz
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  weight        YarnWeight? @relation(fields: [weightId], references: [id], onDelete: SetNull)
  photos        ProjectPhoto[]
  yarnProjects  YarnProject[]
  tags          ProjectTag[]

  @@map("projects")
}

model YarnProject {
  id              Int       @id @default(autoincrement())
  yarnId          Int       @map("yarn_id")
  projectId       Int       @map("project_id")
  allocatedYards  Int?      @map("allocated_yards")
  allocatedWeight Decimal?  @map("allocated_weight") @db.Decimal(10, 2)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  yarn            Yarn      @relation(fields: [yarnId], references: [id], onDelete: Cascade)
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([yarnId, projectId])
  @@map("yarn_projects")
}

model ProjectPhoto {
  id          Int       @id @default(autoincrement())
  projectId   Int       @map("project_id")
  r2Key       String    @map("r2_key") @db.VarChar(255)
  filename    String    @db.VarChar(255)
  contentType String    @map("content_type") @db.VarChar(100)
  size        Int
  isPrimary   Boolean   @default(false) @map("is_primary")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_photos")
}

model Tag {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  name      String    @db.VarChar(100)
  color     String?   @db.VarChar(20)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  yarnTags  YarnTag[]
  projectTags ProjectTag[]

  @@unique([userId, name])
  @@map("tags")
}

model YarnTag {
  id        Int       @id @default(autoincrement())
  yarnId    Int       @map("yarn_id")
  tagId     Int       @map("tag_id")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  yarn      Yarn      @relation(fields: [yarnId], references: [id], onDelete: Cascade)
  tag       Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([yarnId, tagId])
  @@map("yarn_tags")
}

model ProjectTag {
  id        Int       @id @default(autoincrement())
  projectId Int       @map("project_id")
  tagId     Int       @map("tag_id")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tag       Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([projectId, tagId])
  @@map("project_tags")
}
```

## 3. API Endpoints

### 3.1 Next.js API Architecture
The application will use a combination of Next.js API Routes and Server Actions:

- **API Routes**: For traditional REST endpoints, particularly for public access or non-form submissions
- **Server Actions**: For form submissions and authenticated mutations (Next.js 14+ feature)

### 3.2 API Endpoints

#### Authentication
```
POST /api/auth/[...nextauth]  # NextAuth.js handles all auth routes
```

#### Yarn Inventory

```
# API Routes
GET /api/yarns                # List all yarns (with filtering)
GET /api/yarns/:id            # Get a specific yarn
POST /api/yarns               # Create a new yarn
PUT /api/yarns/:id            # Update a yarn
DELETE /api/yarns/:id         # Delete a yarn
GET /api/yarns/stats          # Get yarn inventory statistics

# Server Actions (in app folder)
createYarn(formData)          # Server action for creating yarn
updateYarn(id, formData)      # Server action for updating yarn
deleteYarn(id)                # Server action for deleting yarn
```

#### Projects

```
# API Routes
GET /api/projects             # List all projects (with filtering)
GET /api/projects/:id         # Get a specific project
POST /api/projects            # Create a new project
PUT /api/projects/:id         # Update a project
DELETE /api/projects/:id      # Delete a project

# Server Actions
createProject(formData)       # Server action for creating project
updateProject(id, formData)   # Server action for updating project
deleteProject(id)             # Server action for deleting project
```

#### Yarn-Project Associations

```
# API Routes
GET /api/yarns/:id/projects   # Get projects associated with a yarn
GET /api/projects/:id/yarns   # Get yarns associated with a project
POST /api/yarn-projects       # Associate a yarn with a project
PUT /api/yarn-projects/:id    # Update a yarn-project association
DELETE /api/yarn-projects/:id # Delete a yarn-project association

# Server Actions
associateYarnWithProject(yarnId, projectId, data)  # Server action for associating yarn with project
```

#### File Management (Photos & Patterns)

```
# API Routes
POST /api/upload/yarn-photo     # Upload yarn photo to R2
POST /api/upload/project-photo  # Upload project photo to R2
POST /api/upload/pattern        # Upload pattern PDF to R2
DELETE /api/files/:key          # Delete a file from R2

# Server Actions
uploadYarnPhoto(yarnId, file)           # Server action for uploading yarn photo
uploadProjectPhoto(projectId, file)      # Server action for uploading project photo
uploadPatternPDF(projectId, file)        # Server action for uploading pattern PDF
```

#### Reference Data

```
# API Routes
GET /api/yarn-weights           # Get all yarn weights
GET /api/yarn-brands            # Get all yarn brands (global + user)
POST /api/yarn-brands           # Create a new yarn brand
```

#### Tags

```
# API Routes
GET /api/tags                   # Get all user tags
POST /api/tags                  # Create a new tag
PUT /api/tags/:id               # Update a tag
DELETE /api/tags/:id            # Delete a tag
```

### 3.3 tRPC Routes (Optional Alternative)

If using tRPC for type-safe APIs:

```typescript
export const appRouter = router({
  yarn: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        weightId: z.number().optional(),
        brandId: z.number().optional(),
        // other filters
      }))
      .query(({ ctx, input }) => {
        // Return filtered yarns
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        // Return specific yarn
      }),
    create: protectedProcedure
      .input(yarnSchema)
      .mutation(({ ctx, input }) => {
        // Create yarn logic
      }),
    // etc.
  }),
  
  project: router({
    // Similar structure to yarn router
  }),
  
  // Other routers for different resources
});
```

## 4. File Storage with Cloudflare R2

### 4.1 R2 Structure

```
/users/{userId}/yarns/{yarnId}/{filename}                # Yarn photos
/users/{userId}/projects/{projectId}/{filename}          # Project photos
/users/{userId}/projects/{projectId}/patterns/{filename} # Pattern PDFs
```

### 4.2 R2 Integration

```typescript
// lib/r2.ts
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function uploadFileToR2(
  file: Buffer | ReadableStream,
  key: string,
  contentType: string
) {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    },
  });

  return upload.done();
}

export async function getSignedFileUrl(key: string, expiresIn = 3600) {
  // Get a pre-signed URL to allow temporary access to the file
  // ...implementation
}

export async function deleteFileFromR2(key: string) {
  // Delete file from R2
  // ...implementation
}
```

### 4.3 File Upload/Download Implementation

```typescript
// app/api/upload/yarn-photo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadFileToR2 } from '@/lib/r2';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const yarnId = Number(formData.get('yarnId'));
    
    if (!file || !yarnId) {
      return NextResponse.json({ error: 'Missing file or yarnId' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique key for R2
    const userId = session.user.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `users/${userId}/yarns/${yarnId}/${fileName}`;
    
    // Upload to R2
    await uploadFileToR2(buffer, key, file.type);
    
    // Save reference in database
    const photo = await prisma.yarnPhoto.create({
      data: {
        yarnId,
        r2Key: key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        isPrimary: formData.get('isPrimary') === 'true',
      },
    });
    
    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
```

## 5. Authentication

### 5.1 NextAuth.js Setup

```typescript
// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    session: ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
};
```

### 7.2 Server-Side File Handling (Server Action)

```typescript
// app/actions/uploadActions.ts
'use server'

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadFileToR2 } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function uploadYarnPhoto(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    const file = formData.get('file') as File;
    const yarnId = Number(formData.get('yarnId'));
    const isPrimary = formData.get('isPrimary') === 'true';
    
    if (!file || !yarnId) {
      return { error: 'Missing required fields' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique key for R2
    const userId = session.user.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `users/${userId}/yarns/${yarnId}/${fileName}`;
    
    // Upload to R2
    await uploadFileToR2(buffer, key, file.type);
    
    // If this is marked as primary, update all other photos to not be primary
    if (isPrimary) {
      await prisma.yarnPhoto.updateMany({
        where: { yarnId, isPrimary: true },
        data: { isPrimary: false }
      });
    }
    
    // Save reference in database
    const photo = await prisma.yarnPhoto.create({
      data: {
        yarnId,
        r2Key: key,
        filename: file.name,
        contentType: file.type,
        size: Buffer.byteLength(buffer),
        isPrimary,
      },
    });
    
    revalidatePath(`/dashboard/yarns/${yarnId}`);
    return { success: true, photo };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { error: 'Failed to upload file' };
  }
}

export async function uploadPatternPDF(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    const file = formData.get('file') as File;
    const projectId = Number(formData.get('projectId'));
    
    if (!file || !projectId) {
      return { error: 'Missing required fields' };
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return { error: 'Only PDF files are allowed' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique key for R2
    const userId = session.user.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `users/${userId}/patterns/${fileName}`;
    
    // Upload to R2
    await uploadFileToR2(buffer, key, file.type);
    
    // Update project with pattern reference
    await prisma.project.update({
      where: { id: projectId },
      data: {
        patternR2Key: key,
        patternFilename: file.name,
      },
    });
    
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Error uploading pattern:', error);
    return { error: 'Failed to upload pattern' };
  }
}

// Similar function for project photos
```

### 7.3 File Viewing Component

```typescript
// components/common/FileViewer.tsx
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getSignedFileUrl } from '@/lib/r2Client';

interface FileViewerProps {
  r2Key: string | null;
  contentType?: string;
  filename?: string;
  className?: string;
  alt?: string;
}

export function FileViewer({ r2Key, contentType, filename, className, alt }: FileViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!r2Key) {
      setLoading(false);
      return;
    }
    
    async function fetchSignedUrl() {
      try {
        const response = await fetch(`/api/files/url?key=${encodeURIComponent(r2Key)}`);
        if (!response.ok) throw new Error('Failed to get file URL');
        
        const data = await response.json();
        setUrl(data.url);
      } catch (err) {
        setError('Failed to load file');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSignedUrl();
  }, [r2Key]);
  
  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-md w-full h-40"></div>;
  }
  
  if (error || !url) {
    return <div className="text-red-500 text-sm">{error || 'No file available'}</div>;
  }
  
  // For images
  if (contentType?.startsWith('image/')) {
    return (
      <div className={`relative ${className || 'w-full h-40'}`}>
        <Image
          src={url}
          alt={alt || filename || 'Image'}
          fill
          className="object-cover rounded-md"
        />
      </div>
    );
  }
  
  // For PDFs
  if (contentType?.includes('pdf')) {
    return (
      <div className="flex flex-col">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6h-4V2H4v16zm8-13v3h3l-3-3z"></path>
          </svg>
          {filename || 'View PDF'}
        </a>
        <iframe 
          src={`${url}#view=FitH`} 
          className="w-full h-96 mt-2 border rounded-md" 
          title={filename || 'PDF Viewer'}
        ></iframe>
      </div>
    );
  }
  
  // Fallback for other file types
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center text-indigo-600 hover:text-indigo-800"
    >
      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 18h12V6h-4V2H4v16zm8-13v3h3l-3-3z"></path>
      </svg>
      {filename || 'Download file'}
    </a>
  );
}

export async function importYarnFromCsv(csvContent: string, userId: number) {
  const { data } = parse<YarnCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Step 1: Extract unique brands and create them
  const uniqueBrands = [...new Set(data.map(row => row.Brand).filter(Boolean))];
  
  for (const brandName of uniqueBrands) {
    // Check if brand already exists
    const existingBrand = await prisma.yarnBrand.findFirst({
      where: {
        OR: [
          { name: brandName, isGlobal: true },
          { name: brandName, userId },
        ],
      },
    });
    
    if (!existingBrand) {
      await prisma.yarnBrand.create({
        data: {
          name: brandName,
          userId,
        },
      });
    }
  }
  
  // Step 2: Prepare yarn records
  const yarnsToCreate = [];
  
  for (const row of data) {
    // Find the brand
    const brand = await prisma.yarnBrand.findFirst({
      where: {
        name: row.Brand,
        OR: [
          { isGlobal: true },
          { userId },
        ],
      },
    });
    
    // Prepare projects if any
    const plannedProjects = row['Planned Project'] 
      ? row['Planned Project'].split('\n').filter(Boolean)
      : [];
    
    // Parse the color field to extract current, planned, and dyeing status
    let currentColor = row.Color || '';
    let plannedColor = null;
    let previousColor = null;
    let dyeingStatus = 'not_to_be_dyed';
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (currentColor.includes('-->')) {
      const colorParts = currentColor.split('-->').map(part => part.trim());
      currentColor = colorParts[0];
      plannedColor = colorParts[1];
      dyeingStatus = 'to_be_dyed';
    }
    
    // Determine craft type (default to null if not specified)
    const craftType = row['Craft Type'] || null;
    
    // Prepare yarn record
    const yarnData = {
      userId,
      brandId: brand?.id,
      currentColor: currentColor,
      plannedColor: plannedColor,
      previousColor: previousColor,
      dyeingStatus: dyeingStatus,
      craftType: craftType,
      material: row.Material || '',
      weightId: row.Weight || null,
      yardsPerOz: row['Yard/Oz'] || '',
      totalWeight: row['Total Weight'] || null,
      totalYards: row['Total Yards'] || null,
      organization: row.Organization || '',
      hasProject: !!row['Planned Project'], // Set hasProject flag based on whether project exists
      // We'll handle projects separately
    };
    
    yarnsToCreate.push({
      data: yarnData,
      projects: plannedProjects,
    });
  }
  
  // Step 3: Create yarns and projects in a transaction
  const results = [];
  
  for (const { data: yarnData, projects } of yarnsToCreate) {
    const result = await prisma.$transaction(async (tx) => {
      // Create the yarn
      const yarn = await tx.yarn.create({
        data: yarnData,
      });
      
      // Create projects and associate with yarn
      for (const projectDesc of projects) {
        // Extract basic info from project description
        // This requires some parsing logic based on your format
        const projectData = parseProjectDescription(projectDesc);
        
        // Create or find the project
        const project = await tx.project.create({
          data: {
            userId,
            name: projectData.name,
            weightId: projectData.weightId,
            requiredYardage: projectData.requiredYardage,
            requiredWeight: projectData.requiredWeight,
            status: 'planned',
          },
        });
        
        // Associate yarn with project
        await tx.yarnProject.create({
          data: {
            yarnId: yarn.id,
            projectId: project.id,
          },
        });
      }
      
      return yarn;
    });
    
    results.push(result);
  }
  
  return results;
}

// Helper function to parse project descriptions
function parseProjectDescription(desc: string) {
  // Example: "Lacy Flower Top (Weight 1, 16oz)"
  // Would need to adapt based on your actual format
  const nameMatch = desc.match(/^(.+?)\s*\(/);
  const weightMatch = desc.match(/Weight\s+(\d+)/i);
  const ozMatch = desc.match(/(\d+)\s*oz/i);
  const yardMatch = desc.match(/(\d+)\s*yd/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : desc,
    weightId: weightMatch ? parseInt(weightMatch[1]) : null,
    requiredWeight: ozMatch ? parseFloat(ozMatch[1]) : null,
    requiredYardage: yardMatch ? parseInt(yardMatch[1]) : null,
  };
}

type YarnFormValues = z.infer<typeof yarnSchema>;

export function YarnForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeingStatus: 'not_to_be_dyed'
    }
  });
  
  const createYarn = useCreateYarn();
  const dyeingStatus = watch('dyeingStatus');
  
  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes('-->')) {
      const colorParts = value.split('-->').map(part => part.trim());
      setValue('currentColor', colorParts[0]);
      setValue('plannedColor', colorParts[1]);
      setValue('dyeingStatus', 'to_be_dyed');
    } else {
      setValue('currentColor', value);
    }
  };
  
  const onSubmit = (data: YarnFormValues) => {
    // Update hasProject flag based on project association
    const hasProject = !!data.projectIds && data.projectIds.length > 0;
    
    createYarn.mutate({
      ...data,
      hasProject
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Brand selection */}
      <div>
        <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
          Brand*
        </label>
        <select
          id="brandId"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('brandId', { valueAsNumber: true })}
        >
          {/* Brand options */}
        </select>
        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
      </div>
      
      {/* Color management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentColor" className="block text-sm font-medium text-gray-700">
            Current Color*
          </label>
          <input
            type="text"
            id="currentColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('currentColor')}
            onChange={handleColorChange}
          />
          {errors.currentColor && <p className="mt-1 text-sm text-red-600">{errors.currentColor.message}</p>}
          <p className="mt-1 text-xs text-gray-500">
            You can use "ColorName --> PlannedColor" format for yarns to be dyed
          </p>
        </div>
        
        <div>
          <label htmlFor="dyeingStatus" className="block text-sm font-medium text-gray-700">
            Dyeing Status
          </label>
          <select
            id="dyeingStatus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('dyeingStatus')}
          >
            <option value="not_to_be_dyed">Not to be dyed</option>
            <option value="to_be_dyed">To be dyed</option>
            <option value="has_been_dyed">Has been dyed</option>
          </select>
        </div>
      </div>
      
      {/* Show planned color field if yarn is to be dyed */}
      {dyeingStatus === 'to_be_dyed' && (
        <div>
          <label htmlFor="plannedColor" className="block text-sm font-medium text-gray-700">
            Planned Color
          </label>
          <input
            type="text"
            id="plannedColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('plannedColor')}
          />
        </div>
      )}
      
      {/* Show previous color field if yarn has been dyed */}
      {dyeingStatus === 'has_been_dyed' && (
        <div>
          <label htmlFor="previousColor" className="block text-sm font-medium text-gray-700">
            Previous Color
          </label>
          <input
            type="text"
            id="previousColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('previousColor')}
          />
        </div>
      )}
      
      {/* Craft type selection */}
      <div>
        <label htmlFor="craftType" className="block text-sm font-medium text-gray-700">
          Craft Type
        </label>
        <select
          id="craftType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('craftType')}
        >
          <option value="">Select craft type</option>
          <option value="knitting">Knitting</option>
          <option value="crochet">Crochet</option>
          <option value="both">Both (Knitting & Crochet)</option>
        </select>
      </div>
      
      {/* Remaining fields (material, weight, etc.) */}
      {/* ... */}
      
      <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Save Yarn
      </button>
    </form>
  );
}
} from 'recharts';

interface StashStatisticsProps {
  weightDistribution: Array<{ name: string; value: number; color: string }>;
  brandDistribution: Array<{ name: string; value: number }>;
  totalYardage: number;
  totalWeight: number;
  projectStats: {
    planned: number;
    inProgress: number;
    completed: number;
  };
}

export function StashStatistics({
  weightDistribution,
  brandDistribution,
  totalYardage,
  totalWeight,
  projectStats,
}: StashStatisticsProps) {
  const [activeTab, setActiveTab] = useState('weight');
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Stash Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Yardage</p>
          <p className="text-2xl font-bold">{totalYardage.toLocaleString()} yds</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold">{totalWeight.toLocaleString()} oz</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Projects</p>
          <div className="flex space-x-3">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              {projectStats.planned} Planned
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
              {projectStats.inProgress} Active
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              {projectStats.completed} Done
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-b mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'weight' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('weight')}
          >
            Weight Distribution
          </button>
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'brand' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('brand')}
          >
            Brand Distribution
          </button>
        </nav>
      </div>
      
      <div className="h-64">
        {activeTab === 'weight' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={weightDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {weightDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} yards`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'brand' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={brandDistribution.sort((a, b) => b.value - a.value).slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `${value} yards`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

## 6. Frontend Implementation

### 6.1 Directory Structure

```
/app
  /api         # API routes
  /auth        # Authentication pages
  /dashboard   # Dashboard and main layout
    /yarns     # Yarn inventory views
    /projects  # Project management views
    /settings  # User settings
  /(auth)      # Authentication layouts and routes
  /components  # Shared components
  /lib         # Utility functions and shared code
  /hooks       # Custom React hooks
  /styles      # Global styles
/prisma        # Prisma configuration and schema
/public        # Static assets
```

### 6.2 Key Components

```typescript
// app/dashboard/yarns/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YarnInventory } from '@/components/yarn/YarnInventory';
import { YarnFilters } from '@/components/yarn/YarnFilters';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user's yarns with related data
  const yarns = await prisma.yarn.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      brand: true,
      weight: true,
      photos: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      yarnProjects: {
        include: {
          project: true,
        },
      },
    },
  });

  // Get stats for dashboard
  const stats = await prisma.$transaction([
    prisma.yarn.count({ where: { userId: session.user.id } }),
    prisma.yarn.aggregate({
      where: { userId: session.user.id },
      _sum: { totalYards: true, totalWeight: true },
    }),
    // other stats
  ]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Yarn Inventory</h1>
      
      <DashboardStats stats={stats} />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <YarnFilters />
        </div>
        
        <div className="w-full md:w-3/4">
          <YarnInventory initialYarns={yarns} />
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Data Fetching with React Query

```typescript
// hooks/useYarns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Yarn } from '@prisma/client';

export function useYarns(filters = {}) {
  return useQuery({
    queryKey: ['yarns', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/yarns', { params: filters });
      return data;
    },
  });
}

export function useCreateYarn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newYarn: Partial<Yarn>) => {
      const { data } = await axios.post('/api/yarns', newYarn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarns'] });
    },
  });
}

// similar hooks for update, delete, etc.
```

### 6.4 Form Handling with React Hook Form and Zod

```typescript
// components/yarn/YarnForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateYarn } from '@/hooks/useYarns';

const yarnSchema = z.object({
  brandId: z.number(),
  currentColor: z.string().min(1, 'Current color is required'),
  plannedColor: z.string().optional(),
  previousColor: z.string().optional(),
  dyeingStatus: z.enum(['to_be_dyed', 'not_to_be_dyed', 'has_been_dyed']).default('not_to_be_dyed'),
  craftType: z.enum(['knitting', 'crochet', 'both']).optional(),
  material: z.string().optional(),
  weightId: z.number().optional(),
  yardsPerOz: z.string().optional(),
  totalWeight: z.number().positive().optional(),
  totalYards: z.number().positive().optional(),
  organization: z.string().optional(),
  notes: z.string().optional(),
});

type YarnFormValues = z.infer<typeof yarnSchema>;

export function YarnForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeingStatus: 'not_to_be_dyed'
    }
  });
  
  const createYarn = useCreateYarn();
  const dyeingStatus = watch('dyeingStatus');
  
  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes('-->')) {
      const colorParts = value.split('-->').map(part => part.trim());
      setValue('currentColor', colorParts[0]);
      setValue('plannedColor', colorParts[1]);
      setValue('dyeingStatus', 'to_be_dyed');
    } else {
      setValue('currentColor', value);
    }
  };
  
  const onSubmit = (data: YarnFormValues) => {
    // Update hasProject flag based on project association
    const hasProject = !!data.projectIds && data.projectIds.length > 0;
    
    createYarn.mutate({
      ...data,
      hasProject
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Brand selection */}
      <div>
        <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
          Brand*
        </label>
        <select
          id="brandId"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('brandId', { valueAsNumber: true })}
        >
          {/* Brand options */}
        </select>
        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
      </div>
      
      {/* Color management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentColor" className="block text-sm font-medium text-gray-700">
            Current Color*
          </label>
          <input
            type="text"
            id="currentColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('currentColor')}
            onChange={handleColorChange}
          />
          {errors.currentColor && <p className="mt-1 text-sm text-red-600">{errors.currentColor.message}</p>}
          <p className="mt-1 text-xs text-gray-500">
            You can use "ColorName --> PlannedColor" format for yarns to be dyed
          </p>
        </div>
        
        <div>
          <label htmlFor="dyeingStatus" className="block text-sm font-medium text-gray-700">
            Dyeing Status
          </label>
          <select
            id="dyeingStatus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('dyeingStatus')}
          >
            <option value="not_to_be_dyed">Not to be dyed</option>
            <option value="to_be_dyed">To be dyed</option>
            <option value="has_been_dyed">Has been dyed</option>
          </select>
        </div>
      </div>
      
      {/* Show planned color field if yarn is to be dyed */}
      {dyeingStatus === 'to_be_dyed' && (
        <div>
          <label htmlFor="plannedColor" className="block text-sm font-medium text-gray-700">
            Planned Color
          </label>
          <input
            type="text"
            id="plannedColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('plannedColor')}
          />
        </div>
      )}
      
      {/* Show previous color field if yarn has been dyed */}
      {dyeingStatus === 'has_been_dyed' && (
        <div>
          <label htmlFor="previousColor" className="block text-sm font-medium text-gray-700">
            Previous Color
          </label>
          <input
            type="text"
            id="previousColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('previousColor')}
          />
        </div>
      )}
      
      {/* Craft type selection */}
      <div>
        <label htmlFor="craftType" className="block text-sm font-medium text-gray-700">
          Craft Type
        </label>
        <select
          id="craftType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('craftType')}
        >
          <option value="">Select craft type</option>
          <option value="knitting">Knitting</option>
          <option value="crochet">Crochet</option>
          <option value="both">Both (Knitting & Crochet)</option>
        </select>
      </div>
      
      {/* Remaining fields (material, weight, etc.) */}
      {/* ... */}
      
      <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Save Yarn
      </button>
    </form>
  );
}
```

## 7. File Upload & Management

### 7.1 Client-Side Upload Component

```typescript
// components/common/FileUpload.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  yarnId?: number;
  projectId?: number;
  type: 'yarn-photo' | 'project-photo' | 'pattern';
  onSuccess?: (data: any) => void;
}

export function FileUpload({ yarnId, projectId, type, onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (yarnId) formData.append('yarnId', yarnId.toString());
      if (projectId) formData.append('projectId', projectId.toString());

      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
      <div className="flex flex-col items-center justify-center space-y-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">
          {file ? file.name : 'Click or drag to upload'}
        </p>
        
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={type === 'pattern' ? '.pdf' : 'image/*'}
        />
        
        {file && (
          <div className="flex items-center mt-2">
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        
        <button
          type="button"
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
```
```

## 8. Project Setup & Configuration

### 8.1 Next.js Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable serverless functions for Vercel
  output: 'standalone',
  
  // Configure image domains for R2
  images: {
    domains: [
      // The URL that Cloudflare R2 + Workers or signed URLs will use
      `${process.env.R2_BUCKET_NAME}.r2.dev`,
      // Additional domains if you use a CDN on top
    ],
  },
  
  // Experimental features (if needed)
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### 8.2 Environment Variables (.env.local)

```
# Database
DATABASE_URL="postgres://username:password@neon.db/yarn-tracker"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="Yarn Tracker <noreply@example.com>"

# Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="yarn-tracker"
```

### 8.3 package.json Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/lib-storage": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0",
    "@hookform/resolvers": "^3.3.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.2.0",
    "@radix-ui/react-avatar": "^1.0.3",
    "@radix-ui/react-dialog": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^1.2.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.4",
    "@tanstack/react-query": "^4.33.0",
    "axios": "^1.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.268.0",
    "next": "^14.0.0",
    "next-auth": "^4.23.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.4",
    "recharts": "^2.8.0",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/node": "^20.5.7",
    "@types/react": "^18.2.21",
    "@types/react-dom": "^18.2.7",
    "autoprefixer": "^10.4.15",
    "eslint": "^8.48.0",
    "eslint-config-next": "^13.4.19",
    "postcss": "^8.4.29",
    "prisma": "^5.2.0",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.2.2"
  }
}
```

## 9. Data Migration & Initial Setup

### 9.1 CSV Import Utility

```typescript
// lib/importCsv.ts
import { parse } from 'papaparse';
import { prisma } from '@/lib/prisma';

interface YarnCSVRow {
  Brand: string;
  Color: string; // This could be like "StoneGray --> Light Blue"
  Material: string;
  Weight: number;
  'Yard/Oz': string;
  'Total Weight': number;
  'Total Yards': number;
  Organization: string;
  'Planned Project': string;
  'Craft Type'?: string; // Optional field for knitting/crochet designation
}

export async function importYarnFromCsv(csvContent: string, userId: number) {
  const { data } = parse<YarnCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Step 1: Extract unique brands and create them
  const uniqueBrands = [...new Set(data.map(row => row.Brand).filter(Boolean))];
  
  for (const brandName of uniqueBrands) {
    // Check if brand already exists
    const existingBrand = await prisma.yarnBrand.findFirst({
      where: {
        OR: [
          { name: brandName, isGlobal: true },
          { name: brandName, userId },
        ],
      },
    });
    
    if (!existingBrand) {
      await prisma.yarnBrand.create({
        data: {
          name: brandName,
          userId,
        },
      });
    }
  }
  
  // Step 2: Prepare yarn records
  const yarnsToCreate = [];
  
  for (const row of data) {
    // Find the brand
    const brand = await prisma.yarnBrand.findFirst({
      where: {
        name: row.Brand,
        OR: [
          { isGlobal: true },
          { userId },
        ],
      },
    });
    
    // Prepare projects if any
    const plannedProjects = row['Planned Project'] 
      ? row['Planned Project'].split('\n').filter(Boolean)
      : [];
    
    // Parse the color field to extract current, planned, and dyeing status
    let currentColor = row.Color || '';
    let plannedColor = null;
    let previousColor = null;
    let dyeingStatus = 'not_to_be_dyed';
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (currentColor.includes('-->')) {
      const colorParts = currentColor.split('-->').map(part => part.trim());
      currentColor = colorParts[0];
      plannedColor = colorParts[1];
      dyeingStatus = 'to_be_dyed';
    }
    
    // Determine craft type (default to null if not specified)
    const craftType = row['Craft Type'] || null;
    
    // Prepare yarn record
    const yarnData = {
      userId,
      brandId: brand?.id,
      currentColor: currentColor,
      plannedColor: plannedColor,
      previousColor: previousColor,
      dyeingStatus: dyeingStatus,
      craftType: craftType,
      material: row.Material || '',
      weightId: row.Weight || null,
      yardsPerOz: row['Yard/Oz'] || '',
      totalWeight: row['Total Weight'] || null,
      totalYards: row['Total Yards'] || null,
      organization: row.Organization || '',
      hasProject: !!row['Planned Project'], // Set hasProject flag based on whether project exists
      // We'll handle projects separately
    };
    
    yarnsToCreate.push({
      data: yarnData,
      projects: plannedProjects,
    });
  }
  
  // Step 3: Create yarns and projects in a transaction
  const results = [];
  
  for (const { data: yarnData, projects } of yarnsToCreate) {
    const result = await prisma.$transaction(async (tx) => {
      // Create the yarn
      const yarn = await tx.yarn.create({
        data: yarnData,
      });
      
      // Create projects and associate with yarn
      for (const projectDesc of projects) {
        // Extract basic info from project description
        // This requires some parsing logic based on your format
        const projectData = parseProjectDescription(projectDesc);
        
        // Create or find the project
        const project = await tx.project.create({
          data: {
            userId,
            name: projectData.name,
            weightId: projectData.weightId,
            requiredYardage: projectData.requiredYardage,
            requiredWeight: projectData.requiredWeight,
            status: 'planned',
          },
        });
        
        // Associate yarn with project
        await tx.yarnProject.create({
          data: {
            yarnId: yarn.id,
            projectId: project.id,
          },
        });
      }
      
      return yarn;
    });
    
    results.push(result);
  }
  
  return results;
}

// Helper function to parse project descriptions
function parseProjectDescription(desc: string) {
  // Example: "Lacy Flower Top (Weight 1, 16oz)"
  // Would need to adapt based on your actual format
  const nameMatch = desc.match(/^(.+?)\s*\(/);
  const weightMatch = desc.match(/Weight\s+(\d+)/i);
  const ozMatch = desc.match(/(\d+)\s*oz/i);
  const yardMatch = desc.match(/(\d+)\s*yd/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : desc,
    weightId: weightMatch ? parseInt(weightMatch[1]) : null,
    requiredWeight: ozMatch ? parseFloat(ozMatch[1]) : null,
    requiredYardage: yardMatch ? parseInt(yardMatch[1]) : null,
  };
}
```

### 9.2 Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed yarn weights (standard weights 0-7)
  const weights = [
    { id: 0, name: 'Lace', description: 'Lace weight yarn', colorCode: '#E0F7FA' },
    { id: 1, name: 'Fingering', description: 'Sock, fingering, or baby weight yarn', colorCode: '#B3E5FC' },
    { id: 2, name: 'Sport', description: 'Sport weight yarn', colorCode: '#81D4FA' },
    { id: 3, name: 'DK', description: 'DK or light worsted weight yarn', colorCode: '#4FC3F7' },
    { id: 4, name: 'Worsted', description: 'Worsted or aran weight yarn', colorCode: '#29B6F6' },
    { id: 5, name: 'Bulky', description: 'Bulky or chunky weight yarn', colorCode: '#03A9F4' },
    { id: 6, name: 'Super Bulky', description: 'Super bulky or roving weight yarn', colorCode: '#039BE5' },
    { id: 7, name: 'Jumbo', description: 'Jumbo or extra thick yarn', colorCode: '#0288D1' },
  ];

  for (const weight of weights) {
    await prisma.yarnWeight.upsert({
      where: { id: weight.id },
      update: weight,
      create: weight,
    });
  }

  // Seed global yarn brands (common brands)
  const globalBrands = [
    'Lion Brand',
    'Red Heart',
    'Bernat',
    'Caron',
    'Patons',
    'Lily Sugar\'n Cream',
    'Loops & Threads',
    'Big Twist',
    'Premier',
    'Plymouth',
    'Cascade',
    'Malabrigo',
    'Noro',
    'Knit Picks',
  ];

  for (const brandName of globalBrands) {
    await prisma.yarnBrand.upsert({
      where: { name: brandName },
      update: { isGlobal: true },
      create: { name: brandName, isGlobal: true },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 10. Advanced Features

### 10.1 Yarn Search & Filter System

```typescript
// lib/queryHelpers.ts
import { Prisma } from '@prisma/client';

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
}

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
  dyeingStatus?: string[]; // Filter by dyeing status
  craftType?: string[]; // Filter by craft type (knitting/crochet)
}

export function buildYarnWhereClause(userId: number, filters: YarnFilterParams): Prisma.YarnWhereInput {
  const where: Prisma.YarnWhereInput = {
    userId,
  };
  
  // Text search across multiple fields
  if (filters.search) {
    where.OR = [
      { currentColor: { contains: filters.search, mode: 'insensitive' } },
      { plannedColor: { contains: filters.search, mode: 'insensitive' } },
      { previousColor: { contains: filters.search, mode: 'insensitive' } },
      { material: { contains: filters.search, mode: 'insensitive' } },
      { organization: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
      { brand: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  
  // Weight filter
  if (filters.weightIds?.length) {
    where.weightId = { in: filters.weightIds };
  }
  
  // Brand filter
  if (filters.brandIds?.length) {
    where.brandId = { in: filters.brandIds };
  }
  
  // Material filter (partial match)
  if (filters.materials?.length) {
    where.material = {
      OR: filters.materials.map(material => ({
        contains: material,
        mode: 'insensitive',
      })),
    };
  }
  
  // Project association filter - using both the hasProject flag and relationship check
  if (filters.hasProjects !== undefined) {
    where.hasProject = filters.hasProjects;
    
    // Double-check with relationship for data integrity
    if (filters.hasProjects) {
      where.yarnProjects = { some: {} };
    } else {
      where.yarnProjects = { none: {} };
    }
  }
  
  // Dyeing status filter
  if (filters.dyeingStatus?.length) {
    where.dyeingStatus = { in: filters.dyeingStatus };
  }
  
  // Craft type filter
  if (filters.craftType?.length) {
    where.craftType = { in: filters.craftType };
  }
  
  // Yardage range filter
  if (filters.minYardage !== undefined) {
    where.totalYards = { gte: filters.minYardage };
  }
  
  if (filters.maxYardage !== undefined) {
    where.totalYards = { 
      ...where.totalYards,
      lte: filters.maxYardage 
    };
  }
  
  // Tag filter
  if (filters.tagIds?.length) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }
  
  return where;
}
```

### 10.2 Pattern PDF Viewer

```typescript
// components/project/PatternViewer.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileViewer } from '@/components/common/FileViewer';

// Dynamically import the PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@/components/common/PDFViewer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-md" />,
});

interface PatternViewerProps {
  patternR2Key: string | null;
  patternFilename: string | null;
}

export function PatternViewer({ patternR2Key, patternFilename }: PatternViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  if (!patternR2Key) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <p className="text-gray-500">No pattern uploaded yet</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      {isFullScreen && (
        <button
          className="absolute top-2 right-2 z-10 bg-gray-800 text-white p-2 rounded-full"
          onClick={() => setIsFullScreen(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{patternFilename || 'Pattern'}</h3>
        
        <button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={() => setIsFullScreen(!isFullScreen)}
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </div>
      
      <FileViewer
        r2Key={patternR2Key}
        filename={patternFilename || undefined}
        contentType="application/pdf"
        className={isFullScreen ? 'h-full' : 'h-96'}
      />
    </div>
  );
}
```

### 10.3 Stash Statistics & Visualization

```typescript
// components/dashboard/StashStatistics.tsx
import { useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface StashStatisticsProps {
  weightDistribution: Array<{ name: string; value: number; color: string }>;
  brandDistribution: Array<{ name: string; value: number }>;
  totalYardage: number;
  totalWeight: number;
  projectStats: {
    planned: number;
    inProgress: number;
    completed: number;
  };
}

export function StashStatistics({
  weightDistribution,
  brandDistribution,
  totalYardage,
  totalWeight,
  projectStats,
}: StashStatisticsProps) {
  const [activeTab, setActiveTab] = useState('weight');
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Stash Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Yardage</p>
          <p className="text-2xl font-bold">{totalYardage.toLocaleString()} yds</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold">{totalWeight.toLocaleString()} oz</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Projects</p>
          <div className="flex space-x-3">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              {projectStats.planned} Planned
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
              {projectStats.inProgress} Active
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              {projectStats.completed} Done
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-b mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'weight' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('weight')}
          >
            Weight Distribution
          </button>
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'brand' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('brand')}
          >
            Brand Distribution
          </button>
        </nav>
      </div>
      
      <div className="h-64">
        {activeTab === 'weight' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={weightDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {weightDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} yards`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'brand' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={brandDistribution.sort((a, b) => b.value - a.value).slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `${value} yards`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

## 6. Frontend Implementation

### 6.1 Directory Structure

```
/app
  /api         # API routes
  /auth        # Authentication pages
  /dashboard   # Dashboard and main layout
    /yarns     # Yarn inventory views
    /projects  # Project management views
    /settings  # User settings
  /(auth)      # Authentication layouts and routes
  /components  # Shared components
  /lib         # Utility functions and shared code
  /hooks       # Custom React hooks
  /styles      # Global styles
/prisma        # Prisma configuration and schema
/public        # Static assets
```

### 6.2 Key Components

```typescript
// app/dashboard/yarns/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YarnInventory } from '@/components/yarn/YarnInventory';
import { YarnFilters } from '@/components/yarn/YarnFilters';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user's yarns with related data
  const yarns = await prisma.yarn.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      brand: true,
      weight: true,
      photos: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      yarnProjects: {
        include: {
          project: true,
        },
      },
    },
  });

  // Get stats for dashboard
  const stats = await prisma.$transaction([
    prisma.yarn.count({ where: { userId: session.user.id } }),
    prisma.yarn.aggregate({
      where: { userId: session.user.id },
      _sum: { totalYards: true, totalWeight: true },
    }),
    // other stats
  ]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Yarn Inventory</h1>
      
      <DashboardStats stats={stats} />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <YarnFilters />
        </div>
        
        <div className="w-full md:w-3/4">
          <YarnInventory initialYarns={yarns} />
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Data Fetching with React Query

```typescript
// hooks/useYarns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Yarn } from '@prisma/client';

export function useYarns(filters = {}) {
  return useQuery({
    queryKey: ['yarns', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/yarns', { params: filters });
      return data;
    },
  });
}

export function useCreateYarn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newYarn: Partial<Yarn>) => {
      const { data } = await axios.post('/api/yarns', newYarn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarns'] });
    },
  });
}

// similar hooks for update, delete, etc.
```

### 6.4 Form Handling with React Hook Form and Zod

```typescript
// components/yarn/YarnForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateYarn } from '@/hooks/useYarns';

const yarnSchema = z.object({
  brandId: z.number(),
  currentColor: z.string().min(1, 'Current color is required'),
  plannedColor: z.string().optional(),
  previousColor: z.string().optional(),
  dyeingStatus: z.enum(['to_be_dyed', 'not_to_be_dyed', 'has_been_dyed']).default('not_to_be_dyed'),
  craftType: z.enum(['knitting', 'crochet', 'both']).optional(),
  material: z.string().optional(),
  weightId: z.number().optional(),
  yardsPerOz: z.string().optional(),
  totalWeight: z.number().positive().optional(),
  totalYards: z.number().positive().optional(),
  organization: z.string().optional(),
  notes: z.string().optional(),
});

type YarnFormValues = z.infer<typeof yarnSchema>;

export function YarnForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeingStatus: 'not_to_be_dyed'
    }
  });
  
  const createYarn = useCreateYarn();
  const dyeingStatus = watch('dyeingStatus');
  
  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes('-->')) {
      const colorParts = value.split('-->').map(part => part.trim());
      setValue('currentColor', colorParts[0]);
      setValue('plannedColor', colorParts[1]);
      setValue('dyeingStatus', 'to_be_dyed');
    } else {
      setValue('currentColor', value);
    }
  };
  
  const onSubmit = (data: YarnFormValues) => {
    // Update hasProject flag based on project association
    const hasProject = !!data.projectIds && data.projectIds.length > 0;
    
    createYarn.mutate({
      ...data,
      hasProject
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Brand selection */}
      <div>
        <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
          Brand*
        </label>
        <select
          id="brandId"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('brandId', { valueAsNumber: true })}
        >
          {/* Brand options */}
        </select>
        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
      </div>
      
      {/* Color management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentColor" className="block text-sm font-medium text-gray-700">
            Current Color*
          </label>
          <input
            type="text"
            id="currentColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('currentColor')}
            onChange={handleColorChange}
          />
          {errors.currentColor && <p className="mt-1 text-sm text-red-600">{errors.currentColor.message}</p>}
          <p className="mt-1 text-xs text-gray-500">
            You can use "ColorName --> PlannedColor" format for yarns to be dyed
          </p>
        </div>
        
        <div>
          <label htmlFor="dyeingStatus" className="block text-sm font-medium text-gray-700">
            Dyeing Status
          </label>
          <select
            id="dyeingStatus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('dyeingStatus')}
          >
            <option value="not_to_be_dyed">Not to be dyed</option>
            <option value="to_be_dyed">To be dyed</option>
            <option value="has_been_dyed">Has been dyed</option>
          </select>
        </div>
      </div>
      
      {/* Show planned color field if yarn is to be dyed */}
      {dyeingStatus === 'to_be_dyed' && (
        <div>
          <label htmlFor="plannedColor" className="block text-sm font-medium text-gray-700">
            Planned Color
          </label>
          <input
            type="text"
            id="plannedColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('plannedColor')}
          />
        </div>
      )}
      
      {/* Show previous color field if yarn has been dyed */}
      {dyeingStatus === 'has_been_dyed' && (
        <div>
          <label htmlFor="previousColor" className="block text-sm font-medium text-gray-700">
            Previous Color
          </label>
          <input
            type="text"
            id="previousColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('previousColor')}
          />
        </div>
      )}
      
      {/* Craft type selection */}
      <div>
        <label htmlFor="craftType" className="block text-sm font-medium text-gray-700">
          Craft Type
        </label>
        <select
          id="craftType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('craftType')}
        >
          <option value="">Select craft type</option>
          <option value="knitting">Knitting</option>
          <option value="crochet">Crochet</option>
          <option value="both">Both (Knitting & Crochet)</option>
        </select>
      </div>
      
      {/* Remaining fields (material, weight, etc.) */}
      {/* ... */}
      
      <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Save Yarn
      </button>
    </form>
  );
}
```

## 7. File Upload & Management

### 7.1 Client-Side Upload Component

```typescript
// components/common/FileUpload.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  yarnId?: number;
  projectId?: number;
  type: 'yarn-photo' | 'project-photo' | 'pattern';
  onSuccess?: (data: any) => void;
}

export function FileUpload({ yarnId, projectId, type, onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (yarnId) formData.append('yarnId', yarnId.toString());
      if (projectId) formData.append('projectId', projectId.toString());

      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
      <div className="flex flex-col items-center justify-center space-y-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">
          {file ? file.name : 'Click or drag to upload'}
        </p>
        
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={type === 'pattern' ? '.pdf' : 'image/*'}
        />
        
        {file && (
          <div className="flex items-center mt-2">
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        
        <button
          type="button"
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
```
```

## 8. Project Setup & Configuration

### 8.1 Next.js Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable serverless functions for Vercel
  output: 'standalone',
  
  // Configure image domains for R2
  images: {
    domains: [
      // The URL that Cloudflare R2 + Workers or signed URLs will use
      `${process.env.R2_BUCKET_NAME}.r2.dev`,
      // Additional domains if you use a CDN on top
    ],
  },
  
  // Experimental features (if needed)
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### 8.2 Environment Variables (.env.local)

```
# Database
DATABASE_URL="postgres://username:password@neon.db/yarn-tracker"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="Yarn Tracker <noreply@example.com>"

# Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="yarn-tracker"
```

### 8.3 package.json Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/lib-storage": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0",
    "@hookform/resolvers": "^3.3.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.2.0",
    "@radix-ui/react-avatar": "^1.0.3",
    "@radix-ui/react-dialog": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^1.2.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.4",
    "@tanstack/react-query": "^4.33.0",
    "axios": "^1.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.268.0",
    "next": "^14.0.0",
    "next-auth": "^4.23.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.4",
    "recharts": "^2.8.0",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/node": "^20.5.7",
    "@types/react": "^18.2.21",
    "@types/react-dom": "^18.2.7",
    "autoprefixer": "^10.4.15",
    "eslint": "^8.48.0",
    "eslint-config-next": "^13.4.19",
    "postcss": "^8.4.29",
    "prisma": "^5.2.0",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.2.2"
  }
}
```

## 9. Data Migration & Initial Setup

### 9.1 CSV Import Utility

```typescript
// lib/importCsv.ts
import { parse } from 'papaparse';
import { prisma } from '@/lib/prisma';

interface YarnCSVRow {
  Brand: string;
  Color: string; // This could be like "StoneGray --> Light Blue"
  Material: string;
  Weight: number;
  'Yard/Oz': string;
  'Total Weight': number;
  'Total Yards': number;
  Organization: string;
  'Planned Project': string;
  'Craft Type'?: string; // Optional field for knitting/crochet designation
}

export async function importYarnFromCsv(csvContent: string, userId: number) {
  const { data } = parse<YarnCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Step 1: Extract unique brands and create them
  const uniqueBrands = [...new Set(data.map(row => row.Brand).filter(Boolean))];
  
  for (const brandName of uniqueBrands) {
    // Check if brand already exists
    const existingBrand = await prisma.yarnBrand.findFirst({
      where: {
        OR: [
          { name: brandName, isGlobal: true },
          { name: brandName, userId },
        ],
      },
    });
    
    if (!existingBrand) {
      await prisma.yarnBrand.create({
        data: {
          name: brandName,
          userId,
        },
      });
    }
  }
  
  // Step 2: Prepare yarn records
  const yarnsToCreate = [];
  
  for (const row of data) {
    // Find the brand
    const brand = await prisma.yarnBrand.findFirst({
      where: {
        name: row.Brand,
        OR: [
          { isGlobal: true },
          { userId },
        ],
      },
    });
    
    // Prepare projects if any
    const plannedProjects = row['Planned Project'] 
      ? row['Planned Project'].split('\n').filter(Boolean)
      : [];
    
    // Parse the color field to extract current, planned, and dyeing status
    let currentColor = row.Color || '';
    let plannedColor = null;
    let previousColor = null;
    let dyeingStatus = 'not_to_be_dyed';
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (currentColor.includes('-->')) {
      const colorParts = currentColor.split('-->').map(part => part.trim());
      currentColor = colorParts[0];
      plannedColor = colorParts[1];
      dyeingStatus = 'to_be_dyed';
    }
    
    // Determine craft type (default to null if not specified)
    const craftType = row['Craft Type'] || null;
    
    // Prepare yarn record
    const yarnData = {
      userId,
      brandId: brand?.id,
      currentColor: currentColor,
      plannedColor: plannedColor,
      previousColor: previousColor,
      dyeingStatus: dyeingStatus,
      craftType: craftType,
      material: row.Material || '',
      weightId: row.Weight || null,
      yardsPerOz: row['Yard/Oz'] || '',
      totalWeight: row['Total Weight'] || null,
      totalYards: row['Total Yards'] || null,
      organization: row.Organization || '',
      hasProject: !!row['Planned Project'], // Set hasProject flag based on whether project exists
      // We'll handle projects separately
    };
    
    yarnsToCreate.push({
      data: yarnData,
      projects: plannedProjects,
    });
  }
  
  // Step 3: Create yarns and projects in a transaction
  const results = [];
  
  for (const { data: yarnData, projects } of yarnsToCreate) {
    const result = await prisma.$transaction(async (tx) => {
      // Create the yarn
      const yarn = await tx.yarn.create({
        data: yarnData,
      });
      
      // Create projects and associate with yarn
      for (const projectDesc of projects) {
        // Extract basic info from project description
        // This requires some parsing logic based on your format
        const projectData = parseProjectDescription(projectDesc);
        
        // Create or find the project
        const project = await tx.project.create({
          data: {
            userId,
            name: projectData.name,
            weightId: projectData.weightId,
            requiredYardage: projectData.requiredYardage,
            requiredWeight: projectData.requiredWeight,
            status: 'planned',
          },
        });
        
        // Associate yarn with project
        await tx.yarnProject.create({
          data: {
            yarnId: yarn.id,
            projectId: project.id,
          },
        });
      }
      
      return yarn;
    });
    
    results.push(result);
  }
  
  return results;
}

// Helper function to parse project descriptions
function parseProjectDescription(desc: string) {
  // Example: "Lacy Flower Top (Weight 1, 16oz)"
  // Would need to adapt based on your actual format
  const nameMatch = desc.match(/^(.+?)\s*\(/);
  const weightMatch = desc.match(/Weight\s+(\d+)/i);
  const ozMatch = desc.match(/(\d+)\s*oz/i);
  const yardMatch = desc.match(/(\d+)\s*yd/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : desc,
    weightId: weightMatch ? parseInt(weightMatch[1]) : null,
    requiredWeight: ozMatch ? parseFloat(ozMatch[1]) : null,
    requiredYardage: yardMatch ? parseInt(yardMatch[1]) : null,
  };
}
```

### 9.2 Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed yarn weights (standard weights 0-7)
  const weights = [
    { id: 0, name: 'Lace', description: 'Lace weight yarn', colorCode: '#E0F7FA' },
    { id: 1, name: 'Fingering', description: 'Sock, fingering, or baby weight yarn', colorCode: '#B3E5FC' },
    { id: 2, name: 'Sport', description: 'Sport weight yarn', colorCode: '#81D4FA' },
    { id: 3, name: 'DK', description: 'DK or light worsted weight yarn', colorCode: '#4FC3F7' },
    { id: 4, name: 'Worsted', description: 'Worsted or aran weight yarn', colorCode: '#29B6F6' },
    { id: 5, name: 'Bulky', description: 'Bulky or chunky weight yarn', colorCode: '#03A9F4' },
    { id: 6, name: 'Super Bulky', description: 'Super bulky or roving weight yarn', colorCode: '#039BE5' },
    { id: 7, name: 'Jumbo', description: 'Jumbo or extra thick yarn', colorCode: '#0288D1' },
  ];

  for (const weight of weights) {
    await prisma.yarnWeight.upsert({
      where: { id: weight.id },
      update: weight,
      create: weight,
    });
  }

  // Seed global yarn brands (common brands)
  const globalBrands = [
    'Lion Brand',
    'Red Heart',
    'Bernat',
    'Caron',
    'Patons',
    'Lily Sugar\'n Cream',
    'Loops & Threads',
    'Big Twist',
    'Premier',
    'Plymouth',
    'Cascade',
    'Malabrigo',
    'Noro',
    'Knit Picks',
  ];

  for (const brandName of globalBrands) {
    await prisma.yarnBrand.upsert({
      where: { name: brandName },
      update: { isGlobal: true },
      create: { name: brandName, isGlobal: true },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 10. Advanced Features

### 10.1 Yarn Search & Filter System

```typescript
// lib/queryHelpers.ts
import { Prisma } from '@prisma/client';

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
}

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
  dyeingStatus?: string[]; // Filter by dyeing status
  craftType?: string[]; // Filter by craft type (knitting/crochet)
}

export function buildYarnWhereClause(userId: number, filters: YarnFilterParams): Prisma.YarnWhereInput {
  const where: Prisma.YarnWhereInput = {
    userId,
  };
  
  // Text search across multiple fields
  if (filters.search) {
    where.OR = [
      { currentColor: { contains: filters.search, mode: 'insensitive' } },
      { plannedColor: { contains: filters.search, mode: 'insensitive' } },
      { previousColor: { contains: filters.search, mode: 'insensitive' } },
      { material: { contains: filters.search, mode: 'insensitive' } },
      { organization: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
      { brand: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  
  // Weight filter
  if (filters.weightIds?.length) {
    where.weightId = { in: filters.weightIds };
  }
  
  // Brand filter
  if (filters.brandIds?.length) {
    where.brandId = { in: filters.brandIds };
  }
  
  // Material filter (partial match)
  if (filters.materials?.length) {
    where.material = {
      OR: filters.materials.map(material => ({
        contains: material,
        mode: 'insensitive',
      })),
    };
  }
  
  // Project association filter - using both the hasProject flag and relationship check
  if (filters.hasProjects !== undefined) {
    where.hasProject = filters.hasProjects;
    
    // Double-check with relationship for data integrity
    if (filters.hasProjects) {
      where.yarnProjects = { some: {} };
    } else {
      where.yarnProjects = { none: {} };
    }
  }
  
  // Dyeing status filter
  if (filters.dyeingStatus?.length) {
    where.dyeingStatus = { in: filters.dyeingStatus };
  }
  
  // Craft type filter
  if (filters.craftType?.length) {
    where.craftType = { in: filters.craftType };
  }
  
  // Yardage range filter
  if (filters.minYardage !== undefined) {
    where.totalYards = { gte: filters.minYardage };
  }
  
  if (filters.maxYardage !== undefined) {
    where.totalYards = { 
      ...where.totalYards,
      lte: filters.maxYardage 
    };
  }
  
  // Tag filter
  if (filters.tagIds?.length) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }
  
  return where;
}
```

### 10.2 Pattern PDF Viewer

```typescript
// components/project/PatternViewer.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileViewer } from '@/components/common/FileViewer';

// Dynamically import the PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@/components/common/PDFViewer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-md" />,
});

interface PatternViewerProps {
  patternR2Key: string | null;
  patternFilename: string | null;
}

export function PatternViewer({ patternR2Key, patternFilename }: PatternViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  if (!patternR2Key) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <p className="text-gray-500">No pattern uploaded yet</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      {isFullScreen && (
        <button
          className="absolute top-2 right-2 z-10 bg-gray-800 text-white p-2 rounded-full"
          onClick={() => setIsFullScreen(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{patternFilename || 'Pattern'}</h3>
        
        <button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={() => setIsFullScreen(!isFullScreen)}
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </div>
      
      <FileViewer
        r2Key={patternR2Key}
        filename={patternFilename || undefined}
        contentType="application/pdf"
        className={isFullScreen ? 'h-full' : 'h-96'}
      />
    </div>
  );
}
```

### 10.3 Stash Statistics & Visualization

```typescript
// components/dashboard/StashStatistics.tsx
import { useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface StashStatisticsProps {
  weightDistribution: Array<{ name: string; value: number; color: string }>;
  brandDistribution: Array<{ name: string; value: number }>;
  totalYardage: number;
  totalWeight: number;
  projectStats: {
    planned: number;
    inProgress: number;
    completed: number;
  };
}

export function StashStatistics({
  weightDistribution,
  brandDistribution,
  totalYardage,
  totalWeight,
  projectStats,
}: StashStatisticsProps) {
  const [activeTab, setActiveTab] = useState('weight');
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Stash Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Yardage</p>
          <p className="text-2xl font-bold">{totalYardage.toLocaleString()} yds</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold">{totalWeight.toLocaleString()} oz</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Projects</p>
          <div className="flex space-x-3">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              {projectStats.planned} Planned
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
              {projectStats.inProgress} Active
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              {projectStats.completed} Done
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-b mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'weight' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('weight')}
          >
            Weight Distribution
          </button>
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'brand' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('brand')}
          >
            Brand Distribution
          </button>
        </nav>
      </div>
      
      <div className="h-64">
        {activeTab === 'weight' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={weightDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {weightDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} yards`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'brand' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={brandDistribution.sort((a, b) => b.value - a.value).slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `${value} yards`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

## 6. Frontend Implementation

### 6.1 Directory Structure

```
/app
  /api         # API routes
  /auth        # Authentication pages
  /dashboard   # Dashboard and main layout
    /yarns     # Yarn inventory views
    /projects  # Project management views
    /settings  # User settings
  /(auth)      # Authentication layouts and routes
  /components  # Shared components
  /lib         # Utility functions and shared code
  /hooks       # Custom React hooks
  /styles      # Global styles
/prisma        # Prisma configuration and schema
/public        # Static assets
```

### 6.2 Key Components

```typescript
// app/dashboard/yarns/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YarnInventory } from '@/components/yarn/YarnInventory';
import { YarnFilters } from '@/components/yarn/YarnFilters';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user's yarns with related data
  const yarns = await prisma.yarn.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      brand: true,
      weight: true,
      photos: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      yarnProjects: {
        include: {
          project: true,
        },
      },
    },
  });

  // Get stats for dashboard
  const stats = await prisma.$transaction([
    prisma.yarn.count({ where: { userId: session.user.id } }),
    prisma.yarn.aggregate({
      where: { userId: session.user.id },
      _sum: { totalYards: true, totalWeight: true },
    }),
    // other stats
  ]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Yarn Inventory</h1>
      
      <DashboardStats stats={stats} />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <YarnFilters />
        </div>
        
        <div className="w-full md:w-3/4">
          <YarnInventory initialYarns={yarns} />
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Data Fetching with React Query

```typescript
// hooks/useYarns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Yarn } from '@prisma/client';

export function useYarns(filters = {}) {
  return useQuery({
    queryKey: ['yarns', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/yarns', { params: filters });
      return data;
    },
  });
}

export function useCreateYarn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newYarn: Partial<Yarn>) => {
      const { data } = await axios.post('/api/yarns', newYarn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarns'] });
    },
  });
}

// similar hooks for update, delete, etc.
```

### 6.4 Form Handling with React Hook Form and Zod

```typescript
// components/yarn/YarnForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateYarn } from '@/hooks/useYarns';

const yarnSchema = z.object({
  brandId: z.number(),
  currentColor: z.string().min(1, 'Current color is required'),
  plannedColor: z.string().optional(),
  previousColor: z.string().optional(),
  dyeingStatus: z.enum(['to_be_dyed', 'not_to_be_dyed', 'has_been_dyed']).default('not_to_be_dyed'),
  craftType: z.enum(['knitting', 'crochet', 'both']).optional(),
  material: z.string().optional(),
  weightId: z.number().optional(),
  yardsPerOz: z.string().optional(),
  totalWeight: z.number().positive().optional(),
  totalYards: z.number().positive().optional(),
  organization: z.string().optional(),
  notes: z.string().optional(),
});

type YarnFormValues = z.infer<typeof yarnSchema>;

export function YarnForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeingStatus: 'not_to_be_dyed'
    }
  });
  
  const createYarn = useCreateYarn();
  const dyeingStatus = watch('dyeingStatus');
  
  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes('-->')) {
      const colorParts = value.split('-->').map(part => part.trim());
      setValue('currentColor', colorParts[0]);
      setValue('plannedColor', colorParts[1]);
      setValue('dyeingStatus', 'to_be_dyed');
    } else {
      setValue('currentColor', value);
    }
  };
  
  const onSubmit = (data: YarnFormValues) => {
    // Update hasProject flag based on project association
    const hasProject = !!data.projectIds && data.projectIds.length > 0;
    
    createYarn.mutate({
      ...data,
      hasProject
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Brand selection */}
      <div>
        <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
          Brand*
        </label>
        <select
          id="brandId"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('brandId', { valueAsNumber: true })}
        >
          {/* Brand options */}
        </select>
        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
      </div>
      
      {/* Color management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentColor" className="block text-sm font-medium text-gray-700">
            Current Color*
          </label>
          <input
            type="text"
            id="currentColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('currentColor')}
            onChange={handleColorChange}
          />
          {errors.currentColor && <p className="mt-1 text-sm text-red-600">{errors.currentColor.message}</p>}
          <p className="mt-1 text-xs text-gray-500">
            You can use "ColorName --> PlannedColor" format for yarns to be dyed
          </p>
        </div>
        
        <div>
          <label htmlFor="dyeingStatus" className="block text-sm font-medium text-gray-700">
            Dyeing Status
          </label>
          <select
            id="dyeingStatus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('dyeingStatus')}
          >
            <option value="not_to_be_dyed">Not to be dyed</option>
            <option value="to_be_dyed">To be dyed</option>
            <option value="has_been_dyed">Has been dyed</option>
          </select>
        </div>
      </div>
      
      {/* Show planned color field if yarn is to be dyed */}
      {dyeingStatus === 'to_be_dyed' && (
        <div>
          <label htmlFor="plannedColor" className="block text-sm font-medium text-gray-700">
            Planned Color
          </label>
          <input
            type="text"
            id="plannedColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('plannedColor')}
          />
        </div>
      )}
      
      {/* Show previous color field if yarn has been dyed */}
      {dyeingStatus === 'has_been_dyed' && (
        <div>
          <label htmlFor="previousColor" className="block text-sm font-medium text-gray-700">
            Previous Color
          </label>
          <input
            type="text"
            id="previousColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('previousColor')}
          />
        </div>
      )}
      
      {/* Craft type selection */}
      <div>
        <label htmlFor="craftType" className="block text-sm font-medium text-gray-700">
          Craft Type
        </label>
        <select
          id="craftType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('craftType')}
        >
          <option value="">Select craft type</option>
          <option value="knitting">Knitting</option>
          <option value="crochet">Crochet</option>
          <option value="both">Both (Knitting & Crochet)</option>
        </select>
      </div>
      
      {/* Remaining fields (material, weight, etc.) */}
      {/* ... */}
      
      <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Save Yarn
      </button>
    </form>
  );
}
```

## 7. File Upload & Management

### 7.1 Client-Side Upload Component

```typescript
// components/common/FileUpload.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  yarnId?: number;
  projectId?: number;
  type: 'yarn-photo' | 'project-photo' | 'pattern';
  onSuccess?: (data: any) => void;
}

export function FileUpload({ yarnId, projectId, type, onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (yarnId) formData.append('yarnId', yarnId.toString());
      if (projectId) formData.append('projectId', projectId.toString());

      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
      <div className="flex flex-col items-center justify-center space-y-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">
          {file ? file.name : 'Click or drag to upload'}
        </p>
        
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={type === 'pattern' ? '.pdf' : 'image/*'}
        />
        
        {file && (
          <div className="flex items-center mt-2">
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        
        <button
          type="button"
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
```
```

## 8. Project Setup & Configuration

### 8.1 Next.js Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable serverless functions for Vercel
  output: 'standalone',
  
  // Configure image domains for R2
  images: {
    domains: [
      // The URL that Cloudflare R2 + Workers or signed URLs will use
      `${process.env.R2_BUCKET_NAME}.r2.dev`,
      // Additional domains if you use a CDN on top
    ],
  },
  
  // Experimental features (if needed)
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### 8.2 Environment Variables (.env.local)

```
# Database
DATABASE_URL="postgres://username:password@neon.db/yarn-tracker"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="Yarn Tracker <noreply@example.com>"

# Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="yarn-tracker"
```

### 8.3 package.json Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/lib-storage": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0",
    "@hookform/resolvers": "^3.3.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.2.0",
    "@radix-ui/react-avatar": "^1.0.3",
    "@radix-ui/react-dialog": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^1.2.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.4",
    "@tanstack/react-query": "^4.33.0",
    "axios": "^1.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.268.0",
    "next": "^14.0.0",
    "next-auth": "^4.23.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.4",
    "recharts": "^2.8.0",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/node": "^20.5.7",
    "@types/react": "^18.2.21",
    "@types/react-dom": "^18.2.7",
    "autoprefixer": "^10.4.15",
    "eslint": "^8.48.0",
    "eslint-config-next": "^13.4.19",
    "postcss": "^8.4.29",
    "prisma": "^5.2.0",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.2.2"
  }
}
```

## 9. Data Migration & Initial Setup

### 9.1 CSV Import Utility

```typescript
// lib/importCsv.ts
import { parse } from 'papaparse';
import { prisma } from '@/lib/prisma';

interface YarnCSVRow {
  Brand: string;
  Color: string; // This could be like "StoneGray --> Light Blue"
  Material: string;
  Weight: number;
  'Yard/Oz': string;
  'Total Weight': number;
  'Total Yards': number;
  Organization: string;
  'Planned Project': string;
  'Craft Type'?: string; // Optional field for knitting/crochet designation
}

export async function importYarnFromCsv(csvContent: string, userId: number) {
  const { data } = parse<YarnCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Step 1: Extract unique brands and create them
  const uniqueBrands = [...new Set(data.map(row => row.Brand).filter(Boolean))];
  
  for (const brandName of uniqueBrands) {
    // Check if brand already exists
    const existingBrand = await prisma.yarnBrand.findFirst({
      where: {
        OR: [
          { name: brandName, isGlobal: true },
          { name: brandName, userId },
        ],
      },
    });
    
    if (!existingBrand) {
      await prisma.yarnBrand.create({
        data: {
          name: brandName,
          userId,
        },
      });
    }
  }
  
  // Step 2: Prepare yarn records
  const yarnsToCreate = [];
  
  for (const row of data) {
    // Find the brand
    const brand = await prisma.yarnBrand.findFirst({
      where: {
        name: row.Brand,
        OR: [
          { isGlobal: true },
          { userId },
        ],
      },
    });
    
    // Prepare projects if any
    const plannedProjects = row['Planned Project'] 
      ? row['Planned Project'].split('\n').filter(Boolean)
      : [];
    
    // Parse the color field to extract current, planned, and dyeing status
    let currentColor = row.Color || '';
    let plannedColor = null;
    let previousColor = null;
    let dyeingStatus = 'not_to_be_dyed';
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (currentColor.includes('-->')) {
      const colorParts = currentColor.split('-->').map(part => part.trim());
      currentColor = colorParts[0];
      plannedColor = colorParts[1];
      dyeingStatus = 'to_be_dyed';
    }
    
    // Determine craft type (default to null if not specified)
    const craftType = row['Craft Type'] || null;
    
    // Prepare yarn record
    const yarnData = {
      userId,
      brandId: brand?.id,
      currentColor: currentColor,
      plannedColor: plannedColor,
      previousColor: previousColor,
      dyeingStatus: dyeingStatus,
      craftType: craftType,
      material: row.Material || '',
      weightId: row.Weight || null,
      yardsPerOz: row['Yard/Oz'] || '',
      totalWeight: row['Total Weight'] || null,
      totalYards: row['Total Yards'] || null,
      organization: row.Organization || '',
      hasProject: !!row['Planned Project'], // Set hasProject flag based on whether project exists
      // We'll handle projects separately
    };
    
    yarnsToCreate.push({
      data: yarnData,
      projects: plannedProjects,
    });
  }
  
  // Step 3: Create yarns and projects in a transaction
  const results = [];
  
  for (const { data: yarnData, projects } of yarnsToCreate) {
    const result = await prisma.$transaction(async (tx) => {
      // Create the yarn
      const yarn = await tx.yarn.create({
        data: yarnData,
      });
      
      // Create projects and associate with yarn
      for (const projectDesc of projects) {
        // Extract basic info from project description
        // This requires some parsing logic based on your format
        const projectData = parseProjectDescription(projectDesc);
        
        // Create or find the project
        const project = await tx.project.create({
          data: {
            userId,
            name: projectData.name,
            weightId: projectData.weightId,
            requiredYardage: projectData.requiredYardage,
            requiredWeight: projectData.requiredWeight,
            status: 'planned',
          },
        });
        
        // Associate yarn with project
        await tx.yarnProject.create({
          data: {
            yarnId: yarn.id,
            projectId: project.id,
          },
        });
      }
      
      return yarn;
    });
    
    results.push(result);
  }
  
  return results;
}

// Helper function to parse project descriptions
function parseProjectDescription(desc: string) {
  // Example: "Lacy Flower Top (Weight 1, 16oz)"
  // Would need to adapt based on your actual format
  const nameMatch = desc.match(/^(.+?)\s*\(/);
  const weightMatch = desc.match(/Weight\s+(\d+)/i);
  const ozMatch = desc.match(/(\d+)\s*oz/i);
  const yardMatch = desc.match(/(\d+)\s*yd/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : desc,
    weightId: weightMatch ? parseInt(weightMatch[1]) : null,
    requiredWeight: ozMatch ? parseFloat(ozMatch[1]) : null,
    requiredYardage: yardMatch ? parseInt(yardMatch[1]) : null,
  };
}
```

### 9.2 Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed yarn weights (standard weights 0-7)
  const weights = [
    { id: 0, name: 'Lace', description: 'Lace weight yarn', colorCode: '#E0F7FA' },
    { id: 1, name: 'Fingering', description: 'Sock, fingering, or baby weight yarn', colorCode: '#B3E5FC' },
    { id: 2, name: 'Sport', description: 'Sport weight yarn', colorCode: '#81D4FA' },
    { id: 3, name: 'DK', description: 'DK or light worsted weight yarn', colorCode: '#4FC3F7' },
    { id: 4, name: 'Worsted', description: 'Worsted or aran weight yarn', colorCode: '#29B6F6' },
    { id: 5, name: 'Bulky', description: 'Bulky or chunky weight yarn', colorCode: '#03A9F4' },
    { id: 6, name: 'Super Bulky', description: 'Super bulky or roving weight yarn', colorCode: '#039BE5' },
    { id: 7, name: 'Jumbo', description: 'Jumbo or extra thick yarn', colorCode: '#0288D1' },
  ];

  for (const weight of weights) {
    await prisma.yarnWeight.upsert({
      where: { id: weight.id },
      update: weight,
      create: weight,
    });
  }

  // Seed global yarn brands (common brands)
  const globalBrands = [
    'Lion Brand',
    'Red Heart',
    'Bernat',
    'Caron',
    'Patons',
    'Lily Sugar\'n Cream',
    'Loops & Threads',
    'Big Twist',
    'Premier',
    'Plymouth',
    'Cascade',
    'Malabrigo',
    'Noro',
    'Knit Picks',
  ];

  for (const brandName of globalBrands) {
    await prisma.yarnBrand.upsert({
      where: { name: brandName },
      update: { isGlobal: true },
      create: { name: brandName, isGlobal: true },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 10. Advanced Features

### 10.1 Yarn Search & Filter System

```typescript
// lib/queryHelpers.ts
import { Prisma } from '@prisma/client';

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
}

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
  dyeingStatus?: string[]; // Filter by dyeing status
  craftType?: string[]; // Filter by craft type (knitting/crochet)
}

export function buildYarnWhereClause(userId: number, filters: YarnFilterParams): Prisma.YarnWhereInput {
  const where: Prisma.YarnWhereInput = {
    userId,
  };
  
  // Text search across multiple fields
  if (filters.search) {
    where.OR = [
      { currentColor: { contains: filters.search, mode: 'insensitive' } },
      { plannedColor: { contains: filters.search, mode: 'insensitive' } },
      { previousColor: { contains: filters.search, mode: 'insensitive' } },
      { material: { contains: filters.search, mode: 'insensitive' } },
      { organization: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
      { brand: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  
  // Weight filter
  if (filters.weightIds?.length) {
    where.weightId = { in: filters.weightIds };
  }
  
  // Brand filter
  if (filters.brandIds?.length) {
    where.brandId = { in: filters.brandIds };
  }
  
  // Material filter (partial match)
  if (filters.materials?.length) {
    where.material = {
      OR: filters.materials.map(material => ({
        contains: material,
        mode: 'insensitive',
      })),
    };
  }
  
  // Project association filter - using both the hasProject flag and relationship check
  if (filters.hasProjects !== undefined) {
    where.hasProject = filters.hasProjects;
    
    // Double-check with relationship for data integrity
    if (filters.hasProjects) {
      where.yarnProjects = { some: {} };
    } else {
      where.yarnProjects = { none: {} };
    }
  }
  
  // Dyeing status filter
  if (filters.dyeingStatus?.length) {
    where.dyeingStatus = { in: filters.dyeingStatus };
  }
  
  // Craft type filter
  if (filters.craftType?.length) {
    where.craftType = { in: filters.craftType };
  }
  
  // Yardage range filter
  if (filters.minYardage !== undefined) {
    where.totalYards = { gte: filters.minYardage };
  }
  
  if (filters.maxYardage !== undefined) {
    where.totalYards = { 
      ...where.totalYards,
      lte: filters.maxYardage 
    };
  }
  
  // Tag filter
  if (filters.tagIds?.length) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }
  
  return where;
}
```

### 10.2 Pattern PDF Viewer

```typescript
// components/project/PatternViewer.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileViewer } from '@/components/common/FileViewer';

// Dynamically import the PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@/components/common/PDFViewer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-md" />,
});

interface PatternViewerProps {
  patternR2Key: string | null;
  patternFilename: string | null;
}

export function PatternViewer({ patternR2Key, patternFilename }: PatternViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  if (!patternR2Key) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <p className="text-gray-500">No pattern uploaded yet</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      {isFullScreen && (
        <button
          className="absolute top-2 right-2 z-10 bg-gray-800 text-white p-2 rounded-full"
          onClick={() => setIsFullScreen(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{patternFilename || 'Pattern'}</h3>
        
        <button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={() => setIsFullScreen(!isFullScreen)}
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </div>
      
      <FileViewer
        r2Key={patternR2Key}
        filename={patternFilename || undefined}
        contentType="application/pdf"
        className={isFullScreen ? 'h-full' : 'h-96'}
      />
    </div>
  );
}
```

### 10.3 Stash Statistics & Visualization

```typescript
// components/dashboard/StashStatistics.tsx
import { useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface StashStatisticsProps {
  weightDistribution: Array<{ name: string; value: number; color: string }>;
  brandDistribution: Array<{ name: string; value: number }>;
  totalYardage: number;
  totalWeight: number;
  projectStats: {
    planned: number;
    inProgress: number;
    completed: number;
  };
}

export function StashStatistics({
  weightDistribution,
  brandDistribution,
  totalYardage,
  totalWeight,
  projectStats,
}: StashStatisticsProps) {
  const [activeTab, setActiveTab] = useState('weight');
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Stash Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Yardage</p>
          <p className="text-2xl font-bold">{totalYardage.toLocaleString()} yds</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold">{totalWeight.toLocaleString()} oz</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Projects</p>
          <div className="flex space-x-3">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              {projectStats.planned} Planned
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
              {projectStats.inProgress} Active
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              {projectStats.completed} Done
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-b mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'weight' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('weight')}
          >
            Weight Distribution
          </button>
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'brand' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('brand')}
          >
            Brand Distribution
          </button>
        </nav>
      </div>
      
      <div className="h-64">
        {activeTab === 'weight' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={weightDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {weightDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} yards`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'brand' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={brandDistribution.sort((a, b) => b.value - a.value).slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `${value} yards`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
```

## 6. Frontend Implementation

### 6.1 Directory Structure

```
/app
  /api         # API routes
  /auth        # Authentication pages
  /dashboard   # Dashboard and main layout
    /yarns     # Yarn inventory views
    /projects  # Project management views
    /settings  # User settings
  /(auth)      # Authentication layouts and routes
  /components  # Shared components
  /lib         # Utility functions and shared code
  /hooks       # Custom React hooks
  /styles      # Global styles
/prisma        # Prisma configuration and schema
/public        # Static assets
```

### 6.2 Key Components

```typescript
// app/dashboard/yarns/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YarnInventory } from '@/components/yarn/YarnInventory';
import { YarnFilters } from '@/components/yarn/YarnFilters';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user's yarns with related data
  const yarns = await prisma.yarn.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      brand: true,
      weight: true,
      photos: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      yarnProjects: {
        include: {
          project: true,
        },
      },
    },
  });

  // Get stats for dashboard
  const stats = await prisma.$transaction([
    prisma.yarn.count({ where: { userId: session.user.id } }),
    prisma.yarn.aggregate({
      where: { userId: session.user.id },
      _sum: { totalYards: true, totalWeight: true },
    }),
    // other stats
  ]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Yarn Inventory</h1>
      
      <DashboardStats stats={stats} />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <YarnFilters />
        </div>
        
        <div className="w-full md:w-3/4">
          <YarnInventory initialYarns={yarns} />
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Data Fetching with React Query

```typescript
// hooks/useYarns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Yarn } from '@prisma/client';

export function useYarns(filters = {}) {
  return useQuery({
    queryKey: ['yarns', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/yarns', { params: filters });
      return data;
    },
  });
}

export function useCreateYarn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newYarn: Partial<Yarn>) => {
      const { data } = await axios.post('/api/yarns', newYarn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarns'] });
    },
  });
}

// similar hooks for update, delete, etc.
```

### 6.4 Form Handling with React Hook Form and Zod

```typescript
// components/yarn/YarnForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateYarn } from '@/hooks/useYarns';

const yarnSchema = z.object({
  brandId: z.number(),
  currentColor: z.string().min(1, 'Current color is required'),
  plannedColor: z.string().optional(),
  previousColor: z.string().optional(),
  dyeingStatus: z.enum(['to_be_dyed', 'not_to_be_dyed', 'has_been_dyed']).default('not_to_be_dyed'),
  craftType: z.enum(['knitting', 'crochet', 'both']).optional(),
  material: z.string().optional(),
  weightId: z.number().optional(),
  yardsPerOz: z.string().optional(),
  totalWeight: z.number().positive().optional(),
  totalYards: z.number().positive().optional(),
  organization: z.string().optional(),
  notes: z.string().optional(),
});

type YarnFormValues = z.infer<typeof yarnSchema>;

export function YarnForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeingStatus: 'not_to_be_dyed'
    }
  });
  
  const createYarn = useCreateYarn();
  const dyeingStatus = watch('dyeingStatus');
  
  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes('-->')) {
      const colorParts = value.split('-->').map(part => part.trim());
      setValue('currentColor', colorParts[0]);
      setValue('plannedColor', colorParts[1]);
      setValue('dyeingStatus', 'to_be_dyed');
    } else {
      setValue('currentColor', value);
    }
  };
  
  const onSubmit = (data: YarnFormValues) => {
    // Update hasProject flag based on project association
    const hasProject = !!data.projectIds && data.projectIds.length > 0;
    
    createYarn.mutate({
      ...data,
      hasProject
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Brand selection */}
      <div>
        <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
          Brand*
        </label>
        <select
          id="brandId"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('brandId', { valueAsNumber: true })}
        >
          {/* Brand options */}
        </select>
        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
      </div>
      
      {/* Color management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentColor" className="block text-sm font-medium text-gray-700">
            Current Color*
          </label>
          <input
            type="text"
            id="currentColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('currentColor')}
            onChange={handleColorChange}
          />
          {errors.currentColor && <p className="mt-1 text-sm text-red-600">{errors.currentColor.message}</p>}
          <p className="mt-1 text-xs text-gray-500">
            You can use "ColorName --> PlannedColor" format for yarns to be dyed
          </p>
        </div>
        
        <div>
          <label htmlFor="dyeingStatus" className="block text-sm font-medium text-gray-700">
            Dyeing Status
          </label>
          <select
            id="dyeingStatus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('dyeingStatus')}
          >
            <option value="not_to_be_dyed">Not to be dyed</option>
            <option value="to_be_dyed">To be dyed</option>
            <option value="has_been_dyed">Has been dyed</option>
          </select>
        </div>
      </div>
      
      {/* Show planned color field if yarn is to be dyed */}
      {dyeingStatus === 'to_be_dyed' && (
        <div>
          <label htmlFor="plannedColor" className="block text-sm font-medium text-gray-700">
            Planned Color
          </label>
          <input
            type="text"
            id="plannedColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('plannedColor')}
          />
        </div>
      )}
      
      {/* Show previous color field if yarn has been dyed */}
      {dyeingStatus === 'has_been_dyed' && (
        <div>
          <label htmlFor="previousColor" className="block text-sm font-medium text-gray-700">
            Previous Color
          </label>
          <input
            type="text"
            id="previousColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('previousColor')}
          />
        </div>
      )}
      
      {/* Craft type selection */}
      <div>
        <label htmlFor="craftType" className="block text-sm font-medium text-gray-700">
          Craft Type
        </label>
        <select
          id="craftType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('craftType')}
        >
          <option value="">Select craft type</option>
          <option value="knitting">Knitting</option>
          <option value="crochet">Crochet</option>
          <option value="both">Both (Knitting & Crochet)</option>
        </select>
      </div>
      
      {/* Remaining fields (material, weight, etc.) */}
      {/* ... */}
      
      <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Save Yarn
      </button>
    </form>
  );
}
```

## 7. File Upload & Management

### 7.1 Client-Side Upload Component

```typescript
// components/common/FileUpload.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  yarnId?: number;
  projectId?: number;
  type: 'yarn-photo' | 'project-photo' | 'pattern';
  onSuccess?: (data: any) => void;
}

export function FileUpload({ yarnId, projectId, type, onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (yarnId) formData.append('yarnId', yarnId.toString());
      if (projectId) formData.append('projectId', projectId.toString());

      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
      <div className="flex flex-col items-center justify-center space-y-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">
          {file ? file.name : 'Click or drag to upload'}
        </p>
        
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={type === 'pattern' ? '.pdf' : 'image/*'}
        />
        
        {file && (
          <div className="flex items-center mt-2">
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        
        <button
          type="button"
# Yarn Inventory Tracker - Technical Specification

## 1. Technology Stack

### 1.1 Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn UI (built on Radix UI primitives)
- **State Management**: React Context API + Hooks
- **Form Handling**: React Hook Form + Zod validation
- **Data Fetching**: React Query/TanStack Query
- **Charts**: Recharts or D3.js

### 1.2 Backend
- **Framework**: Next.js API Routes/Server Actions
- **Database**: Neon PostgreSQL (serverless, branching capabilities)
- **File Storage**: Cloudflare R2 (S3-compatible object storage)
- **Authentication**: NextAuth.js / Auth.js
- **ORM**: Prisma or Drizzle
- **API Type Safety**: tRPC (optional for full-stack type safety)

### 1.3 Deployment & Infrastructure
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + custom logging
- **Environment Variables**: Vercel Environment Variables

## 2. Database Schema

### 2.1 PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn weights reference table
CREATE TABLE yarn_weights (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color_code VARCHAR(20) NOT NULL
);

-- Yarn brands reference table
CREATE TABLE yarn_brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  website VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn inventory table
CREATE TABLE yarns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  brand_id INTEGER REFERENCES yarn_brands(id) ON DELETE SET NULL,
  
  -- Color management with dyeing tracking
  current_color VARCHAR(255) NOT NULL,
  planned_color VARCHAR(255),
  previous_color VARCHAR(255),
  color_code VARCHAR(20),
  
  -- Dyeing status tracking
  dyeing_status VARCHAR(50) NOT NULL DEFAULT 'not_to_be_dyed', -- Options: 'to_be_dyed', 'not_to_be_dyed', 'has_been_dyed'
  
  -- Craft type
  craft_type VARCHAR(50), -- 'knitting', 'crochet', 'both', or NULL if unspecified
  
  -- Other yarn details
  material TEXT,
  weight_id INTEGER REFERENCES yarn_weights(id) ON DELETE SET NULL,
  yards_per_oz VARCHAR(50),
  total_weight DECIMAL(10, 2),
  total_yards INTEGER,
  organization VARCHAR(100),
  notes TEXT,
  has_project BOOLEAN DEFAULT FALSE, -- Quick flag for project association
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn photos table
CREATE TABLE yarn_photos (
  id SERIAL PRIMARY KEY,
  yarn_id INTEGER REFERENCES yarns(id) ON DELETE CASCADE,
  r2_key VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  weight_id INTEGER REFERENCES yarn_weights(id) ON DELETE SET NULL,
  required_yardage INTEGER,
  required_weight DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, frogged
  notes TEXT,
  pattern_r2_key VARCHAR(255),
  pattern_filename VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yarn-Project association table (many-to-many)
CREATE TABLE yarn_projects (
  id SERIAL PRIMARY KEY,
  yarn_id INTEGER REFERENCES yarns(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  allocated_yards INTEGER,
  allocated_weight DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(yarn_id, project_id)
);

-- Project photos table
CREATE TABLE project_photos (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  r2_key VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Yarn-Tag association table
CREATE TABLE yarn_tags (
  id SERIAL PRIMARY KEY,
  yarn_id INTEGER REFERENCES yarns(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(yarn_id, tag_id)
);

-- Project-Tag association table
CREATE TABLE project_tags (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, tag_id)
);
```

### 2.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz
  
  yarns       Yarn[]
  projects    Project[]
  yarnBrands  YarnBrand[]
  tags        Tag[]

  @@map("users")
}

model YarnWeight {
  id          Int     @id
  name        String  @db.VarChar(100)
  description String?
  colorCode   String  @map("color_code") @db.VarChar(20)
  
  yarns       Yarn[]
  projects    Project[]

  @@map("yarn_weights")
}

model YarnBrand {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(255)
  website   String?
  userId    Int?     @map("user_id")
  isGlobal  Boolean  @default(false) @map("is_global")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  yarns     Yarn[]

  @@map("yarn_brands")
}

model Yarn {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  brandId     Int?      @map("brand_id")
  
  // Color management with dyeing tracking
  currentColor String    @map("current_color") @db.VarChar(255)
  plannedColor String?   @map("planned_color") @db.VarChar(255)
  previousColor String?  @map("previous_color") @db.VarChar(255)
  colorCode   String?    @map("color_code") @db.VarChar(20)
  
  // Dyeing status tracking
  dyeingStatus String    @default("not_to_be_dyed") @map("dyeing_status") @db.VarChar(50)
  
  // Craft type
  craftType   String?    @map("craft_type") @db.VarChar(50)
  
  // Other yarn details
  material    String?
  weightId    Int?      @map("weight_id")
  yardsPerOz  String?   @map("yards_per_oz") @db.VarChar(50)
  totalWeight Decimal?  @map("total_weight") @db.Decimal(10, 2)
  totalYards  Int?      @map("total_yards")
  organization String?  @db.VarChar(100)
  notes       String?
  hasProject  Boolean   @default(false) @map("has_project")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @default(now()) @map("updated_at") @db.Timestamptz
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  brand       YarnBrand? @relation(fields: [brandId], references: [id], onDelete: SetNull)
  weight      YarnWeight? @relation(fields: [weightId], references: [id], onDelete: SetNull)
  photos      YarnPhoto[]
  yarnProjects YarnProject[]
  tags        YarnTag[]

  @@map("yarns")
}

model YarnPhoto {
  id          Int       @id @default(autoincrement())
  yarnId      Int       @map("yarn_id")
  r2Key       String    @map("r2_key") @db.VarChar(255)
  filename    String    @db.VarChar(255)
  contentType String    @map("content_type") @db.VarChar(100)
  size        Int
  isPrimary   Boolean   @default(false) @map("is_primary")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  yarn        Yarn      @relation(fields: [yarnId], references: [id], onDelete: Cascade)

  @@map("yarn_photos")
}

model Project {
  id            Int       @id @default(autoincrement())
  userId        Int       @map("user_id")
  name          String    @db.VarChar(255)
  weightId      Int?      @map("weight_id")
  requiredYardage Int?    @map("required_yardage")
  requiredWeight Decimal? @map("required_weight") @db.Decimal(10, 2)
  status        String    @default("planned") @db.VarChar(50)
  notes         String?
  patternR2Key  String?   @map("pattern_r2_key") @db.VarChar(255)
  patternFilename String? @map("pattern_filename") @db.VarChar(255)
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime  @default(now()) @map("updated_at") @db.Timestamptz
  
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  weight        YarnWeight? @relation(fields: [weightId], references: [id], onDelete: SetNull)
  photos        ProjectPhoto[]
  yarnProjects  YarnProject[]
  tags          ProjectTag[]

  @@map("projects")
}

model YarnProject {
  id              Int       @id @default(autoincrement())
  yarnId          Int       @map("yarn_id")
  projectId       Int       @map("project_id")
  allocatedYards  Int?      @map("allocated_yards")
  allocatedWeight Decimal?  @map("allocated_weight") @db.Decimal(10, 2)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  yarn            Yarn      @relation(fields: [yarnId], references: [id], onDelete: Cascade)
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([yarnId, projectId])
  @@map("yarn_projects")
}

model ProjectPhoto {
  id          Int       @id @default(autoincrement())
  projectId   Int       @map("project_id")
  r2Key       String    @map("r2_key") @db.VarChar(255)
  filename    String    @db.VarChar(255)
  contentType String    @map("content_type") @db.VarChar(100)
  size        Int
  isPrimary   Boolean   @default(false) @map("is_primary")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_photos")
}

model Tag {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  name      String    @db.VarChar(100)
  color     String?   @db.VarChar(20)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  yarnTags  YarnTag[]
  projectTags ProjectTag[]

  @@unique([userId, name])
  @@map("tags")
}

model YarnTag {
  id        Int       @id @default(autoincrement())
  yarnId    Int       @map("yarn_id")
  tagId     Int       @map("tag_id")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  yarn      Yarn      @relation(fields: [yarnId], references: [id], onDelete: Cascade)
  tag       Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([yarnId, tagId])
  @@map("yarn_tags")
}

model ProjectTag {
  id        Int       @id @default(autoincrement())
  projectId Int       @map("project_id")
  tagId     Int       @map("tag_id")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tag       Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([projectId, tagId])
  @@map("project_tags")
}
```

## 3. API Endpoints

### 3.1 Next.js API Architecture
The application will use a combination of Next.js API Routes and Server Actions:

- **API Routes**: For traditional REST endpoints, particularly for public access or non-form submissions
- **Server Actions**: For form submissions and authenticated mutations (Next.js 14+ feature)

### 3.2 API Endpoints

#### Authentication
```
POST /api/auth/[...nextauth]  # NextAuth.js handles all auth routes
```

#### Yarn Inventory

```
# API Routes
GET /api/yarns                # List all yarns (with filtering)
GET /api/yarns/:id            # Get a specific yarn
POST /api/yarns               # Create a new yarn
PUT /api/yarns/:id            # Update a yarn
DELETE /api/yarns/:id         # Delete a yarn
GET /api/yarns/stats          # Get yarn inventory statistics

# Server Actions (in app folder)
createYarn(formData)          # Server action for creating yarn
updateYarn(id, formData)      # Server action for updating yarn
deleteYarn(id)                # Server action for deleting yarn
```

#### Projects

```
# API Routes
GET /api/projects             # List all projects (with filtering)
GET /api/projects/:id         # Get a specific project
POST /api/projects            # Create a new project
PUT /api/projects/:id         # Update a project
DELETE /api/projects/:id      # Delete a project

# Server Actions
createProject(formData)       # Server action for creating project
updateProject(id, formData)   # Server action for updating project
deleteProject(id)             # Server action for deleting project
```

#### Yarn-Project Associations

```
# API Routes
GET /api/yarns/:id/projects   # Get projects associated with a yarn
GET /api/projects/:id/yarns   # Get yarns associated with a project
POST /api/yarn-projects       # Associate a yarn with a project
PUT /api/yarn-projects/:id    # Update a yarn-project association
DELETE /api/yarn-projects/:id # Delete a yarn-project association

# Server Actions
associateYarnWithProject(yarnId, projectId, data)  # Server action for associating yarn with project
```

#### File Management (Photos & Patterns)

```
# API Routes
POST /api/upload/yarn-photo     # Upload yarn photo to R2
POST /api/upload/project-photo  # Upload project photo to R2
POST /api/upload/pattern        # Upload pattern PDF to R2
DELETE /api/files/:key          # Delete a file from R2

# Server Actions
uploadYarnPhoto(yarnId, file)           # Server action for uploading yarn photo
uploadProjectPhoto(projectId, file)      # Server action for uploading project photo
uploadPatternPDF(projectId, file)        # Server action for uploading pattern PDF
```

#### Reference Data

```
# API Routes
GET /api/yarn-weights           # Get all yarn weights
GET /api/yarn-brands            # Get all yarn brands (global + user)
POST /api/yarn-brands           # Create a new yarn brand
```

#### Tags

```
# API Routes
GET /api/tags                   # Get all user tags
POST /api/tags                  # Create a new tag
PUT /api/tags/:id               # Update a tag
DELETE /api/tags/:id            # Delete a tag
```

### 3.3 tRPC Routes (Optional Alternative)

If using tRPC for type-safe APIs:

```typescript
export const appRouter = router({
  yarn: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        weightId: z.number().optional(),
        brandId: z.number().optional(),
        // other filters
      }))
      .query(({ ctx, input }) => {
        // Return filtered yarns
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        // Return specific yarn
      }),
    create: protectedProcedure
      .input(yarnSchema)
      .mutation(({ ctx, input }) => {
        // Create yarn logic
      }),
    // etc.
  }),
  
  project: router({
    // Similar structure to yarn router
  }),
  
  // Other routers for different resources
});
```

## 4. File Storage with Cloudflare R2

### 4.1 R2 Structure

```
/users/{userId}/yarns/{yarnId}/{filename}    # Yarn photos
/users/{userId}/projects/{projectId}/{filename}    # Project photos
/users/{userId}/patterns/{filename}    # Pattern PDFs
```

### 4.2 R2 Integration

```typescript
// lib/r2.ts
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export async function uploadFileToR2(
  file: Buffer | ReadableStream,
  key: string,
  contentType: string
) {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    },
  });

  return upload.done();
}

export async function getSignedFileUrl(key: string, expiresIn = 3600) {
  // Get a pre-signed URL to allow temporary access to the file
  // ...implementation
}

export async function deleteFileFromR2(key: string) {
  // Delete file from R2
  // ...implementation
}
```

### 4.3 File Upload/Download Implementation

```typescript
// app/api/upload/yarn-photo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadFileToR2 } from '@/lib/r2';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const yarnId = Number(formData.get('yarnId'));
    
    if (!file || !yarnId) {
      return NextResponse.json({ error: 'Missing file or yarnId' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique key for R2
    const userId = session.user.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `users/${userId}/yarns/${yarnId}/${fileName}`;
    
    // Upload to R2
    await uploadFileToR2(buffer, key, file.type);
    
    // Save reference in database
    const photo = await prisma.yarnPhoto.create({
      data: {
        yarnId,
        r2Key: key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        isPrimary: formData.get('isPrimary') === 'true',
      },
    });
    
    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
```

## 5. Authentication

### 5.1 NextAuth.js Setup

```typescript
// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    session: ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
};

### 7.2 Server-Side File Handling (Server Action)

```typescript
// app/actions/uploadActions.ts
'use server'

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadFileToR2 } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function uploadYarnPhoto(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    const file = formData.get('file') as File;
    const yarnId = Number(formData.get('yarnId'));
    const isPrimary = formData.get('isPrimary') === 'true';
    
    if (!file || !yarnId) {
      return { error: 'Missing required fields' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique key for R2
    const userId = session.user.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `users/${userId}/yarns/${yarnId}/${fileName}`;
    
    // Upload to R2
    await uploadFileToR2(buffer, key, file.type);
    
    // If this is marked as primary, update all other photos to not be primary
    if (isPrimary) {
      await prisma.yarnPhoto.updateMany({
        where: { yarnId, isPrimary: true },
        data: { isPrimary: false }
      });
    }
    
    // Save reference in database
    const photo = await prisma.yarnPhoto.create({
      data: {
        yarnId,
        r2Key: key,
        filename: file.name,
        contentType: file.type,
        size: Buffer.byteLength(buffer),
        isPrimary,
      },
    });
    
    revalidatePath(`/dashboard/yarns/${yarnId}`);
    return { success: true, photo };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { error: 'Failed to upload file' };
  }
}

export async function uploadPatternPDF(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  try {
    const file = formData.get('file') as File;
    const projectId = Number(formData.get('projectId'));
    
    if (!file || !projectId) {
      return { error: 'Missing required fields' };
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return { error: 'Only PDF files are allowed' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate unique key for R2
    const userId = session.user.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const key = `users/${userId}/patterns/${fileName}`;
    
    // Upload to R2
    await uploadFileToR2(buffer, key, file.type);
    
    // Update project with pattern reference
    await prisma.project.update({
      where: { id: projectId },
      data: {
        patternR2Key: key,
        patternFilename: file.name,
      },
    });
    
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Error uploading pattern:', error);
    return { error: 'Failed to upload pattern' };
  }
}

// Similar function for project photos
```

### 7.3 File Viewing Component

```typescript
// components/common/FileViewer.tsx
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getSignedFileUrl } from '@/lib/r2Client';

interface FileViewerProps {
  r2Key: string | null;
  contentType?: string;
  filename?: string;
  className?: string;
  alt?: string;
}

export function FileViewer({ r2Key, contentType, filename, className, alt }: FileViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!r2Key) {
      setLoading(false);
      return;
    }
    
    async function fetchSignedUrl() {
      try {
        const response = await fetch(`/api/files/url?key=${encodeURIComponent(r2Key)}`);
        if (!response.ok) throw new Error('Failed to get file URL');
        
        const data = await response.json();
        setUrl(data.url);
      } catch (err) {
        setError('Failed to load file');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSignedUrl();
  }, [r2Key]);
  
  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded-md w-full h-40"></div>;
  }
  
  if (error || !url) {
    return <div className="text-red-500 text-sm">{error || 'No file available'}</div>;
  }
  
  // For images
  if (contentType?.startsWith('image/')) {
    return (
      <div className={`relative ${className || 'w-full h-40'}`}>
        <Image
          src={url}
          alt={alt || filename || 'Image'}
          fill
          className="object-cover rounded-md"
        />
      </div>
    );
  }
  
  // For PDFs
  if (contentType?.includes('pdf')) {
    return (
      <div className="flex flex-col">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6h-4V2H4v16zm8-13v3h3l-3-3z"></path>
          </svg>
          {filename || 'View PDF'}
        </a>
        <iframe 
          src={`${url}#view=FitH`} 
          className="w-full h-96 mt-2 border rounded-md" 
          title={filename || 'PDF Viewer'}
        ></iframe>
      </div>
    );
  }
  
  // Fallback for other file types
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center text-indigo-600 hover:text-indigo-800"
    >
      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 18h12V6h-4V2H4v16zm8-13v3h3l-3-3z"></path>
      </svg>
      {filename || 'Download file'}
    </a>
  );
}

### 10.4 Project Requirements Calculator

```typescript
// components/project/RequirementsCalculator.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const calculatorSchema = z.object({
  patternYardage: z.number().min(1, 'Yardage is required'),
  patternWeight: z.number().optional(),
  patternSize: z.string().optional(),
  targetSize: z.string().optional(),
  sizeDifference: z.number().optional(),
  margin: z.number().min(0).default(10),
});

type CalculatorInputs = z.infer<typeof calculatorSchema>;

interface RequirementsCalculatorProps {
  onCalculate: (requirements: {
    requiredYardage: number;
    requiredWeight: number | null;
  }) => void;
  initialYardage?: number;
  initialWeight?: number;
}

export function RequirementsCalculator({
  onCalculate,
  initialYardage,
  initialWeight,
}: RequirementsCalculatorProps) {
  const [results, setResults] = useState<{
    requiredYardage: number;
    requiredWeight: number | null;
  } | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<CalculatorInputs>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      patternYardage: initialYardage,
      patternWeight: initialWeight || undefined,
      margin: 10,
    },
  });
  
  const onSubmit = (data: CalculatorInputs) => {
    // Basic calculation with size adjustment and safety margin
    let adjustmentFactor = 1;
    
    if (data.sizeDifference) {
      // Adjust based on size difference percentage
      adjustmentFactor = 1 + (data.sizeDifference / 100);
    }
    
    // Add safety margin
    const marginFactor = 1 + (data.margin / 100);
    
    // Calculate required yardage
    const requiredYardage = Math.ceil(data.patternYardage * adjustmentFactor * marginFactor);
    
    // Calculate required weight if pattern weight is provided
    let requiredWeight = null;
    if (data.patternWeight) {
      requiredWeight = parseFloat((data.patternWeight * adjustmentFactor * marginFactor).toFixed(2));
    }
    
    const results = {
      requiredYardage,
      requiredWeight,
    };
    
    setResults(results);
    onCalculate(results);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-medium mb-4">Project Requirements Calculator</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Yardage*
            </label>
            <input
              type="number"
              {...register('patternYardage', { valueAsNumber: true })}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {errors.patternYardage && (
              <p className="text-red-500 text-xs mt-1">{errors.patternYardage.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Weight (oz)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('patternWeight', { valueAsNumber: true })}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Size
            </label>
            <input
              type="text"
              {...register('patternSize')}
              placeholder="e.g., S, 36in, etc."
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Size
            </label>
            <input
              type="text"
              {...register('targetSize')}
              placeholder="e.g., L, 44in, etc."
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size Adjustment (%)
            </label>
            <input
              type="number"
              {...register('sizeDifference', { valueAsNumber: true })}
              placeholder="e.g., 20 for 20% larger"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Safety Margin (%)
            </label>
            <input
              type="number"
              {...register('margin', { valueAsNumber: true })}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Calculate Requirements
        </button>
      </form>
      
      {results && (
        <div className="mt-4 bg-indigo-50 p-4 rounded-md">
          <h4 className="font-medium text-indigo-900 mb-2">Calculation Results:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Required Yardage</p>
              <p className="text-xl font-bold">{results.requiredYardage} yds</p>
            </div>
            {results.requiredWeight !== null && (
              <div>
                <p className="text-sm text-gray-500">Required Weight</p>
                <p className="text-xl font-bold">{results.requiredWeight} oz</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 11. Serverless Functions and Edge Optimization

### 11.1 Cloudflare R2 with Edge Functions

```typescript
// app/api/files/url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedFileUrl } from '@/lib/r2';

export const runtime = 'edge'; // Use edge runtime for performance

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
    }
    
    // Verify the user has access to this file
    const userId = session.user.id;
    const userPrefix = `users/${userId}/`;
    
    if (!key.startsWith(userPrefix)) {
      // Check if this is a yarn photo, project photo, or pattern
      const hasAccess = await verifyFileAccess(key, userId);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    
    // Generate signed URL with 1 hour expiration
    const signedUrl = await getSignedFileUrl(key, 3600);
    
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating file URL:', error);
    return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 });
  }
}

async function verifyFileAccess(key: string, userId: number): Promise<boolean> {
  // Check if it's a yarn photo
  const yarnPhoto = await prisma.yarnPhoto.findFirst({
    where: { r2Key: key },
    include: { yarn: true },
  });
  
  if (yarnPhoto && yarnPhoto.yarn.userId === userId) {
    return true;
  }
  
  // Check if it's a project photo
  const projectPhoto = await prisma.projectPhoto.findFirst({
    where: { r2Key: key },
    include: { project: true },
  });
  
  if (projectPhoto && projectPhoto.project.userId === userId) {
    return true;
  }
  
  // Check if it's a pattern
  const project = await prisma.project.findFirst({
    where: { patternR2Key: key, userId },
  });
  
  if (project) {
    return true;
  }
  
  return false;
}
```

### 11.2 Optimized Search with Database Indexes

```sql
-- Add indexes to improve query performance
CREATE INDEX idx_yarn_user_id ON yarns(user_id);
CREATE INDEX idx_yarn_weight_id ON yarns(weight_id);
CREATE INDEX idx_yarn_brand_id ON yarns(brand_id);
CREATE INDEX idx_yarn_color ON yarns(color);
CREATE INDEX idx_project_user_id ON projects(user_id);
CREATE INDEX idx_project_status ON projects(status);
CREATE INDEX idx_yarn_project_yarn_id ON yarn_projects(yarn_id);
CREATE INDEX idx_yarn_project_project_id ON yarn_projects(project_id);
CREATE INDEX idx_yarn_tag_yarn_id ON yarn_tags(yarn_id);
CREATE INDEX idx_yarn_tag_tag_id ON yarn_tags(tag_id);
```

### 11.3 Optimized API Response Caching

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache static assets from R2
  if (request.nextUrl.pathname.startsWith('/api/files/url') && request.method === 'GET') {
    response.headers.set('Cache-Control', 'public, max-age=3600');
  }

  // Cache reference data like yarn weights, static brands
  if (request.nextUrl.pathname === '/api/yarn-weights' && request.method === 'GET') {
    response.headers.set('Cache-Control', 'public, max-age=86400'); // 24 hours
  }

  return response;
}

export const config = {
  matcher: ['/api/files/url', '/api/yarn-weights'],
};
```

## 12. Deployment Strategy

### 12.1 Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_VERCEL_URL": "${VERCEL_URL}"
  }
}
```

### 12.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 13. Security Considerations

### 13.1 Authentication and Authorization

- Use NextAuth.js for secure authentication
- Implement proper authorization checks for all API routes and server actions
- Avoid storing sensitive information in local storage or cookies
- Implement CSRF protection for all mutations

### 13.2 Data Protection

- Sanitize all user inputs to prevent injection attacks
- Implement rate limiting for API routes to prevent abuse
- Use secure HTTP-only cookies for session management
- Never expose database credentials or API keys to the client

### 13.3 Cloud Storage Security

- Implement strict access controls for R2 storage
- Use short-lived signed URLs for file access
- Validate file types on upload to prevent malicious files
- Use proper CORS configuration for R2 buckets

## 14. Monitoring and Analytics

### 14.1 Error Tracking

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function initMonitoring() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error:', error, context);
  }
}
```

### 14.2 Performance Monitoring

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

## 15. Internationalization and Accessibility

### 15.1 i18n Setup

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const LOCALES = ['en', 'es', 'fr'];
const DEFAULT_LOCALE = 'en';

function getLocale(request: NextRequest) {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return match(languages, LOCALES, DEFAULT_LOCALE);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip for api routes and static files
  if (pathname.startsWith('/api') || 
      pathname.match(/\.(jpg|png|svg|ico|css|js)$/)) {
    return NextResponse.next();
  }
  
  // Check if pathname is missing locale
  const pathnameHasLocale = LOCALES.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  
  if (pathnameHasLocale) return NextResponse.next();
  
  // Redirect to locale path
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip these paths
    '/((?!api|_next|_vercel|.*\\.|favicon.ico).*)',
  ],
};
```

### 15.2 Accessibility Features

```typescript
// components/ui/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
        secondary: 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={props.disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```
```

## 8. Project Setup & Configuration

### 8.1 Next.js Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable serverless functions for Vercel
  output: 'standalone',
  
  // Configure image domains for R2
  images: {
    domains: [
      // The URL that Cloudflare R2 + Workers or signed URLs will use
      `${process.env.R2_BUCKET_NAME}.r2.dev`,
      // Additional domains if you use a CDN on top
    ],
  },
  
  // Experimental features (if needed)
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### 8.2 Environment Variables (.env.local)

```
# Database
DATABASE_URL="postgres://username:password@neon.db/yarn-tracker"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="Yarn Tracker <noreply@example.com>"

# Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="yarn-tracker"
```

### 8.3 package.json Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/lib-storage": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0",
    "@hookform/resolvers": "^3.3.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.2.0",
    "@radix-ui/react-avatar": "^1.0.3",
    "@radix-ui/react-dialog": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^1.2.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.4",
    "@tanstack/react-query": "^4.33.0",
    "axios": "^1.5.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.268.0",
    "next": "^14.0.0",
    "next-auth": "^4.23.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.4",
    "recharts": "^2.8.0",
    "tailwind-merge": "^1.14.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/node": "^20.5.7",
    "@types/react": "^18.2.21",
    "@types/react-dom": "^18.2.7",
    "autoprefixer": "^10.4.15",
    "eslint": "^8.48.0",
    "eslint-config-next": "^13.4.19",
    "postcss": "^8.4.29",
    "prisma": "^5.2.0",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.2.2"
  }
}
```

## 9. Data Migration & Initial Setup

### 9.1 CSV Import Utility

```typescript
// lib/importCsv.ts
import { parse } from 'papaparse';
import { prisma } from '@/lib/prisma';

interface YarnCSVRow {
  Brand: string;
  Color: string; // This could be like "StoneGray --> Light Blue"
  Material: string;
  Weight: number;
  'Yard/Oz': string;
  'Total Weight': number;
  'Total Yards': number;
  Organization: string;
  'Planned Project': string;
  'Craft Type'?: string; // Optional field for knitting/crochet designation
}

export async function importYarnFromCsv(csvContent: string, userId: number) {
  const { data } = parse<YarnCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Step 1: Extract unique brands and create them
  const uniqueBrands = [...new Set(data.map(row => row.Brand).filter(Boolean))];
  
  for (const brandName of uniqueBrands) {
    // Check if brand already exists
    const existingBrand = await prisma.yarnBrand.findFirst({
      where: {
        OR: [
          { name: brandName, isGlobal: true },
          { name: brandName, userId },
        ],
      },
    });
    
    if (!existingBrand) {
      await prisma.yarnBrand.create({
        data: {
          name: brandName,
          userId,
        },
      });
    }
  }
  
  // Step 2: Prepare yarn records
  const yarnsToCreate = [];
  
  for (const row of data) {
    // Find the brand
    const brand = await prisma.yarnBrand.findFirst({
      where: {
        name: row.Brand,
        OR: [
          { isGlobal: true },
          { userId },
        ],
      },
    });
    
    // Prepare projects if any
    const plannedProjects = row['Planned Project'] 
      ? row['Planned Project'].split('\n').filter(Boolean)
      : [];
    
    // Parse the color field to extract current, planned, and dyeing status
    let currentColor = row.Color || '';
    let plannedColor = null;
    let previousColor = null;
    let dyeingStatus = 'not_to_be_dyed';
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (currentColor.includes('-->')) {
      const colorParts = currentColor.split('-->').map(part => part.trim());
      currentColor = colorParts[0];
      plannedColor = colorParts[1];
      dyeingStatus = 'to_be_dyed';
    }
    
    // Determine craft type (default to null if not specified)
    const craftType = row['Craft Type'] || null;
    
    // Prepare yarn record
    const yarnData = {
      userId,
      brandId: brand?.id,
      currentColor: currentColor,
      plannedColor: plannedColor,
      previousColor: previousColor,
      dyeingStatus: dyeingStatus,
      craftType: craftType,
      material: row.Material || '',
      weightId: row.Weight || null,
      yardsPerOz: row['Yard/Oz'] || '',
      totalWeight: row['Total Weight'] || null,
      totalYards: row['Total Yards'] || null,
      organization: row.Organization || '',
      hasProject: !!row['Planned Project'], // Set hasProject flag based on whether project exists
      // We'll handle projects separately
    };
    
    yarnsToCreate.push({
      data: yarnData,
      projects: plannedProjects,
    });
  }
  
  // Step 3: Create yarns and projects in a transaction
  const results = [];
  
  for (const { data: yarnData, projects } of yarnsToCreate) {
    const result = await prisma.$transaction(async (tx) => {
      // Create the yarn
      const yarn = await tx.yarn.create({
        data: yarnData,
      });
      
      // Create projects and associate with yarn
      for (const projectDesc of projects) {
        // Extract basic info from project description
        // This requires some parsing logic based on your format
        const projectData = parseProjectDescription(projectDesc);
        
        // Create or find the project
        const project = await tx.project.create({
          data: {
            userId,
            name: projectData.name,
            weightId: projectData.weightId,
            requiredYardage: projectData.requiredYardage,
            requiredWeight: projectData.requiredWeight,
            status: 'planned',
          },
        });
        
        // Associate yarn with project
        await tx.yarnProject.create({
          data: {
            yarnId: yarn.id,
            projectId: project.id,
          },
        });
      }
      
      return yarn;
    });
    
    results.push(result);
  }
  
  return results;
}

// Helper function to parse project descriptions
function parseProjectDescription(desc: string) {
  // Example: "Lacy Flower Top (Weight 1, 16oz)"
  // Would need to adapt based on your actual format
  const nameMatch = desc.match(/^(.+?)\s*\(/);
  const weightMatch = desc.match(/Weight\s+(\d+)/i);
  const ozMatch = desc.match(/(\d+)\s*oz/i);
  const yardMatch = desc.match(/(\d+)\s*yd/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : desc,
    weightId: weightMatch ? parseInt(weightMatch[1]) : null,
    requiredWeight: ozMatch ? parseFloat(ozMatch[1]) : null,
    requiredYardage: yardMatch ? parseInt(yardMatch[1]) : null,
  };
}
```

### 9.2 Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed yarn weights (standard weights 0-7)
  const weights = [
    { id: 0, name: 'Lace', description: 'Lace weight yarn', colorCode: '#E0F7FA' },
    { id: 1, name: 'Fingering', description: 'Sock, fingering, or baby weight yarn', colorCode: '#B3E5FC' },
    { id: 2, name: 'Sport', description: 'Sport weight yarn', colorCode: '#81D4FA' },
    { id: 3, name: 'DK', description: 'DK or light worsted weight yarn', colorCode: '#4FC3F7' },
    { id: 4, name: 'Worsted', description: 'Worsted or aran weight yarn', colorCode: '#29B6F6' },
    { id: 5, name: 'Bulky', description: 'Bulky or chunky weight yarn', colorCode: '#03A9F4' },
    { id: 6, name: 'Super Bulky', description: 'Super bulky or roving weight yarn', colorCode: '#039BE5' },
    { id: 7, name: 'Jumbo', description: 'Jumbo or extra thick yarn', colorCode: '#0288D1' },
  ];

  for (const weight of weights) {
    await prisma.yarnWeight.upsert({
      where: { id: weight.id },
      update: weight,
      create: weight,
    });
  }

  // Seed global yarn brands (common brands)
  const globalBrands = [
    'Lion Brand',
    'Red Heart',
    'Bernat',
    'Caron',
    'Patons',
    'Lily Sugar\'n Cream',
    'Loops & Threads',
    'Big Twist',
    'Premier',
    'Plymouth',
    'Cascade',
    'Malabrigo',
    'Noro',
    'Knit Picks',
  ];

  for (const brandName of globalBrands) {
    await prisma.yarnBrand.upsert({
      where: { name: brandName },
      update: { isGlobal: true },
      create: { name: brandName, isGlobal: true },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 10. Advanced Features

### 10.1 Yarn Search & Filter System

```typescript
// lib/queryHelpers.ts
import { Prisma } from '@prisma/client';

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
}

export interface YarnFilterParams {
  search?: string;
  weightIds?: number[];
  brandIds?: number[];
  materials?: string[];
  hasProjects?: boolean;
  minYardage?: number;
  maxYardage?: number;
  tagIds?: number[];
  dyeingStatus?: string[]; // Filter by dyeing status
  craftType?: string[]; // Filter by craft type (knitting/crochet)
}

export function buildYarnWhereClause(userId: number, filters: YarnFilterParams): Prisma.YarnWhereInput {
  const where: Prisma.YarnWhereInput = {
    userId,
  };
  
  // Text search across multiple fields
  if (filters.search) {
    where.OR = [
      { currentColor: { contains: filters.search, mode: 'insensitive' } },
      { plannedColor: { contains: filters.search, mode: 'insensitive' } },
      { previousColor: { contains: filters.search, mode: 'insensitive' } },
      { material: { contains: filters.search, mode: 'insensitive' } },
      { organization: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
      { brand: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  
  // Weight filter
  if (filters.weightIds?.length) {
    where.weightId = { in: filters.weightIds };
  }
  
  // Brand filter
  if (filters.brandIds?.length) {
    where.brandId = { in: filters.brandIds };
  }
  
  // Material filter (partial match)
  if (filters.materials?.length) {
    where.material = {
      OR: filters.materials.map(material => ({
        contains: material,
        mode: 'insensitive',
      })),
    };
  }
  
  // Project association filter - using both the hasProject flag and relationship check
  if (filters.hasProjects !== undefined) {
    where.hasProject = filters.hasProjects;
    
    // Double-check with relationship for data integrity
    if (filters.hasProjects) {
      where.yarnProjects = { some: {} };
    } else {
      where.yarnProjects = { none: {} };
    }
  }
  
  // Dyeing status filter
  if (filters.dyeingStatus?.length) {
    where.dyeingStatus = { in: filters.dyeingStatus };
  }
  
  // Craft type filter
  if (filters.craftType?.length) {
    where.craftType = { in: filters.craftType };
  }
  
  // Yardage range filter
  if (filters.minYardage !== undefined) {
    where.totalYards = { gte: filters.minYardage };
  }
  
  if (filters.maxYardage !== undefined) {
    where.totalYards = { 
      ...where.totalYards,
      lte: filters.maxYardage 
    };
  }
  
  // Tag filter
  if (filters.tagIds?.length) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }
  
  return where;
}
```

### 10.2 Pattern PDF Viewer

```typescript
// components/project/PatternViewer.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileViewer } from '@/components/common/FileViewer';

// Dynamically import the PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@/components/common/PDFViewer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-md" />,
});

interface PatternViewerProps {
  patternR2Key: string | null;
  patternFilename: string | null;
}

export function PatternViewer({ patternR2Key, patternFilename }: PatternViewerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  if (!patternR2Key) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <p className="text-gray-500">No pattern uploaded yet</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      {isFullScreen && (
        <button
          className="absolute top-2 right-2 z-10 bg-gray-800 text-white p-2 rounded-full"
          onClick={() => setIsFullScreen(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{patternFilename || 'Pattern'}</h3>
        
        <button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={() => setIsFullScreen(!isFullScreen)}
        >
          {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
        </button>
      </div>
      
      <FileViewer
        r2Key={patternR2Key}
        filename={patternFilename || undefined}
        contentType="application/pdf"
        className={isFullScreen ? 'h-full' : 'h-96'}
      />
    </div>
  );
}
```

### 10.3 Stash Statistics & Visualization

```typescript
// components/dashboard/StashStatistics.tsx
import { useState } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface StashStatisticsProps {
  weightDistribution: Array<{ name: string; value: number; color: string }>;
  brandDistribution: Array<{ name: string; value: number }>;
  totalYardage: number;
  totalWeight: number;
  projectStats: {
    planned: number;
    inProgress: number;
    completed: number;
  };
}

export function StashStatistics({
  weightDistribution,
  brandDistribution,
  totalYardage,
  totalWeight,
  projectStats,
}: StashStatisticsProps) {
  const [activeTab, setActiveTab] = useState('weight');
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">Stash Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Yardage</p>
          <p className="text-2xl font-bold">{totalYardage.toLocaleString()} yds</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Total Weight</p>
          <p className="text-2xl font-bold">{totalWeight.toLocaleString()} oz</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">Projects</p>
          <div className="flex space-x-3">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              {projectStats.planned} Planned
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span>
              {projectStats.inProgress} Active
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              {projectStats.completed} Done
            </p>
          </div>
        </div>
      </div>
      
      <div className="border-b mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'weight' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('weight')}
          >
            Weight Distribution
          </button>
          <button
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'brand' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
            onClick={() => setActiveTab('brand')}
          >
            Brand Distribution
          </button>
        </nav>
      </div>
      
      <div className="h-64">
        {activeTab === 'weight' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={weightDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {weightDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} yards`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'brand' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={brandDistribution.sort((a, b) => b.value - a.value).slice(0, 10)}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `${value} yards`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}```

## 6. Frontend Implementation

### 6.1 Directory Structure

```
/app
  /api         # API routes
  /auth        # Authentication pages
  /dashboard   # Dashboard and main layout
    /yarns     # Yarn inventory views
    /projects  # Project management views
    /settings  # User settings
  /(auth)      # Authentication layouts and routes
  /components  # Shared components
  /lib         # Utility functions and shared code
  /hooks       # Custom React hooks
  /styles      # Global styles
/prisma        # Prisma configuration and schema
/public        # Static assets
```

### 6.2 Key Components

```typescript
// app/dashboard/yarns/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { YarnInventory } from '@/components/yarn/YarnInventory';
import { YarnFilters } from '@/components/yarn/YarnFilters';
import { DashboardStats } from '@/components/dashboard/DashboardStats';

export default async function YarnsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Get user's yarns with related data
  const yarns = await prisma.yarn.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      brand: true,
      weight: true,
      photos: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      yarnProjects: {
        include: {
          project: true,
        },
      },
    },
  });

  // Get stats for dashboard
  const stats = await prisma.$transaction([
    prisma.yarn.count({ where: { userId: session.user.id } }),
    prisma.yarn.aggregate({
      where: { userId: session.user.id },
      _sum: { totalYards: true, totalWeight: true },
    }),
    // other stats
  ]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Yarn Inventory</h1>
      
      <DashboardStats stats={stats} />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <YarnFilters />
        </div>
        
        <div className="w-full md:w-3/4">
          <YarnInventory initialYarns={yarns} />
        </div>
      </div>
    </div>
  );
}
```

### 6.3 Data Fetching with React Query

```typescript
// hooks/useYarns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Yarn } from '@prisma/client';

export function useYarns(filters = {}) {
  return useQuery({
    queryKey: ['yarns', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/yarns', { params: filters });
      return data;
    },
  });
}

export function useCreateYarn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newYarn: Partial<Yarn>) => {
      const { data } = await axios.post('/api/yarns', newYarn);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarns'] });
    },
  });
}

// similar hooks for update, delete, etc.
```

### 6.4 Form Handling with React Hook Form and Zod

```typescript
// components/yarn/YarnForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateYarn } from '@/hooks/useYarns';

const yarnSchema = z.object({
  brandId: z.number(),
  currentColor: z.string().min(1, 'Current color is required'),
  plannedColor: z.string().optional(),
  previousColor: z.string().optional(),
  dyeingStatus: z.enum(['to_be_dyed', 'not_to_be_dyed', 'has_been_dyed']).default('not_to_be_dyed'),
  craftType: z.enum(['knitting', 'crochet', 'both']).optional(),
  material: z.string().optional(),
  weightId: z.number().optional(),
  yardsPerOz: z.string().optional(),
  totalWeight: z.number().positive().optional(),
  totalYards: z.number().positive().optional(),
  organization: z.string().optional(),
  notes: z.string().optional(),
});

type YarnFormValues = z.infer<typeof yarnSchema>;

export function YarnForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeingStatus: 'not_to_be_dyed'
    }
  });
  
  const createYarn = useCreateYarn();
  const dyeingStatus = watch('dyeingStatus');
  
  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes('-->')) {
      const colorParts = value.split('-->').map(part => part.trim());
      setValue('currentColor', colorParts[0]);
      setValue('plannedColor', colorParts[1]);
      setValue('dyeingStatus', 'to_be_dyed');
    } else {
      setValue('currentColor', value);
    }
  };
  
  const onSubmit = (data: YarnFormValues) => {
    // Update hasProject flag based on project association
    const hasProject = !!data.projectIds && data.projectIds.length > 0;
    
    createYarn.mutate({
      ...data,
      hasProject
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Brand selection */}
      <div>
        <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
          Brand*
        </label>
        <select
          id="brandId"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('brandId', { valueAsNumber: true })}
        >
          {/* Brand options */}
        </select>
        {errors.brandId && <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>}
      </div>
      
      {/* Color management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="currentColor" className="block text-sm font-medium text-gray-700">
            Current Color*
          </label>
          <input
            type="text"
            id="currentColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('currentColor')}
            onChange={handleColorChange}
          />
          {errors.currentColor && <p className="mt-1 text-sm text-red-600">{errors.currentColor.message}</p>}
          <p className="mt-1 text-xs text-gray-500">
            You can use "ColorName --> PlannedColor" format for yarns to be dyed
          </p>
        </div>
        
        <div>
          <label htmlFor="dyeingStatus" className="block text-sm font-medium text-gray-700">
            Dyeing Status
          </label>
          <select
            id="dyeingStatus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('dyeingStatus')}
          >
            <option value="not_to_be_dyed">Not to be dyed</option>
            <option value="to_be_dyed">To be dyed</option>
            <option value="has_been_dyed">Has been dyed</option>
          </select>
        </div>
      </div>
      
      {/* Show planned color field if yarn is to be dyed */}
      {dyeingStatus === 'to_be_dyed' && (
        <div>
          <label htmlFor="plannedColor" className="block text-sm font-medium text-gray-700">
            Planned Color
          </label>
          <input
            type="text"
            id="plannedColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('plannedColor')}
          />
        </div>
      )}
      
      {/* Show previous color field if yarn has been dyed */}
      {dyeingStatus === 'has_been_dyed' && (
        <div>
          <label htmlFor="previousColor" className="block text-sm font-medium text-gray-700">
            Previous Color
          </label>
          <input
            type="text"
            id="previousColor"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            {...register('previousColor')}
          />
        </div>
      )}
      
      {/* Craft type selection */}
      <div>
        <label htmlFor="craftType" className="block text-sm font-medium text-gray-700">
          Craft Type
        </label>
        <select
          id="craftType"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          {...register('craftType')}
        >
          <option value="">Select craft type</option>
          <option value="knitting">Knitting</option>
          <option value="crochet">Crochet</option>
          <option value="both">Both (Knitting & Crochet)</option>
        </select>
      </div>
      
      {/* Remaining fields (material, weight, etc.) */}
      {/* ... */}
      
      <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Save Yarn
      </button>
    </form>
  );
}
```

## 7. File Upload & Management

### 7.1 Client-Side Upload Component

```typescript
// components/common/FileUpload.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  yarnId?: number;
  projectId?: number;
  type: 'yarn-photo' | 'project-photo' | 'pattern';
  onSuccess?: (data: any) => void;
}

export function FileUpload({ yarnId, projectId, type, onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (yarnId) formData.append('yarnId', yarnId.toString());
      if (projectId) formData.append('projectId', projectId.toString());

      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
      <div className="flex flex-col items-center justify-center space-y-2">
        <Upload className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">
          {file ? file.name : 'Click or drag to upload'}
        </p>
        
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept={type === 'pattern' ? '.pdf' : 'image/*'}
        />
        
        {file && (
          <div className="flex items-center mt-2">
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        
        <button
          type="button"
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}