import { NextRequest, NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import crypto from "crypto";

const toApiCategory = (category: any) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  image: category.image,
  parentId: category.parent_id,
  createdAt: category.created_at,
  updatedAt: category.updated_at,
});

const mapCategoryUpdates = (updates: Record<string, any>) => {
  const mapped: Record<string, any> = {};

  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.slug !== undefined) mapped.slug = updates.slug;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.image !== undefined) mapped.image = updates.image;
  if (updates.parentId !== undefined) mapped.parent_id = updates.parentId;

  return mapped;
};

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const categories = await dbHelpers.getAllCategories();
    return NextResponse.json({ categories: categories.map(toApiCategory) });
  } catch (error) {
    console.error("Error fetching admin categories:", error);
    return NextResponse.json({ message: "Failed to fetch categories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = crypto.randomUUID();

    await dbHelpers.insertCategory({
      id,
      name: body.name,
      slug: body.slug,
      description: body.description || null,
      image: body.image || null,
      parentId: body.parentId || null,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ message: "Failed to create category." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ message: "Category id is required." }, { status: 400 });
    }

    const updates = mapCategoryUpdates(body.updates || {});
    if (!Object.keys(updates).length) {
      return NextResponse.json({ message: "No updates provided." }, { status: 400 });
    }

    await dbHelpers.updateCategory(id, updates);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ message: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "Category id is required." }, { status: 400 });
    }

    await dbHelpers.deleteCategory(id);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ message: "Failed to delete category." }, { status: 500 });
  }
}
