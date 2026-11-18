/** ApexChain Network Operations Intelligence Platform */
/**
 * Operator annotation types (Issue #912).
 *
 * Contracts for operator notes, annotations and resolution context snippets.
 * The form value shapes are kept separate from the persisted entity so create
 * and edit forms can be validated before submission, and the models remain
 * compatible with timeline and report modules.
 */

/** Purpose of an operator annotation. */
export type AnnotationCategory = "note" | "cause" | "resolution" | "follow-up";

/** Who may see the annotation. */
export type AnnotationVisibility = "internal" | "public";

/** Entity types an annotation may be attached to. */
export type AnnotationTargetType = "outage" | "sla" | "settlement" | "endpoint";

/** Minimal author metadata embedded in an annotation. */
export interface AnnotationAuthor {
  id: string;
  displayName: string;
}

/** A persisted operator annotation. */
export interface Annotation {
  id: string;
  body: string;
  category: AnnotationCategory;
  visibility: AnnotationVisibility;
  author: AnnotationAuthor;
  /** ISO-8601 timestamp the annotation was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last edit, when the annotation changed. */
  updatedAt?: string | null;
  targetType: AnnotationTargetType;
  targetId: string;
}

/** Form values for creating a new annotation. */
export interface AnnotationFormValues {
  body: string;
  category: AnnotationCategory;
  visibility: AnnotationVisibility;
  targetType: AnnotationTargetType;
  targetId: string;
}

/** Form values for editing an existing annotation's content. */
export interface AnnotationEditValues {
  body: string;
  category: AnnotationCategory;
  visibility: AnnotationVisibility;
}
