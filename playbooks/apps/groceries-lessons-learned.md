# Groceries / Cartly Lessons Learned

Use these lessons for Cartly and all future grocery, household, list, and coordination apps.

## Core V1 product lesson
A grocery app cannot stay generic. It must become specific to what the household actually buys.

Generic items are useful as entry points, but the product should learn exact household preferences over time.

Example:
- Generic item: Toilet paper
- Specific product: Quilted Northern Ultra Soft & Strong
- Household preference: this household usually buys Quilted Northern for toilet paper

## Required V1 pillars
Cartly V1 must protect:
- fast item capture
- household coordination
- product-specific household memory
- ease of use

## Barcode lesson
Barcode scanning is required for Cartly V1.

The scanner must not only decode a barcode number. It must feed product identification, product memory, and future suggestions.

Barcode matching must use the full normalized UPC/EAN, including leading digits and check digits.

## Product lookup lesson
Common U.S. grocery and household products must resolve automatically whenever reasonably possible.

Use a layered resolver:
- household product memory
- Cartly global product cache
- Open Food Facts
- USDA FoodData Central / Global Branded Foods
- commercial barcode/product API fallback
- user-assisted fallback only last

## Unknown product lesson
Unknown barcodes should not become dead ends.

If a barcode is not found:
- save the barcode immediately
- allow quick name, review later, or label photo
- use OCR/image understanding to extract product details
- ask the user to confirm before saving
- save to household memory immediately after confirmation

## Feedback loop lesson
Every unknown product resolved by a user should create a pending global product submission.

The household gets immediate use. The shared/global product database updates only after verification.

Admin review must support:
- approve
- edit and approve
- merge
- reject

Verified products should improve future scans for other households.

## Ease-of-use lesson
Do not repeat known pain points from other apps:
- features that technically exist but create more work
- fake or shallow automation
- too much manual entry
- confusing household/member coordination
- generic item lists that never become personalized
- scan flows that interrupt fast capture

## Backend implication
Barcode/product memory requires backend persistence.

Cartly needs:
- Auth
- Firestore
- Storage
- household/member data
- grocery lists and list items
- household product memory
- global product cache
- unresolved barcode scans
- product submissions
- admin review workflow

## Execution lesson
Use small verified backend phases first:
- Firebase config
- Auth smoke test
- Firestore smoke test
- Storage smoke test
- repository/service seams
- first real list migration
- household/member migration
- product memory
- barcode resolver
- unknown product workflow
- admin review queue

Increase prompt size only after the pattern is proven.

## Reuse rule
Every Cartly lesson must improve future app builds.

Van/team should carry forward:
- product-specific memory patterns
- barcode resolver patterns
- unknown item feedback loops
- admin verification workflow
- ease-of-use checks
- backend service/repository seams
