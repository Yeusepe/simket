// Cedar policy: product entitlement check
// A buyer can view a product's post-sale content only if they have purchased it.
permit(
  principal,
  action == Simket::Action::"ViewPostSaleContent",
  resource
) when {
  principal has purchases &&
  resource.id in principal.purchases
};

// Creators can manage their own products
// Uses entity reference comparison: resource.creator must be an entity ref to the principal
permit(
  principal,
  action == Simket::Action::"ManageProduct",
  resource
) when {
  resource.creator == principal
};

// Creators can view their own dashboard
permit(
  principal,
  action == Simket::Action::"ViewCreatorDashboard",
  resource
) when {
  principal.isCreator == true
};

// Collaborators can view product analytics
// Uses entity reference for creator and set membership for collaborators
permit(
  principal,
  action == Simket::Action::"ViewProductAnalytics",
  resource
) when {
  resource.creator == principal ||
  principal in resource.collaborators
};

// Anyone can view published products
permit(
  principal,
  action == Simket::Action::"ViewProduct",
  resource
) when {
  resource.state == "Published"
};

// Admin can do anything
permit(
  principal == Simket::User::"admin",
  action,
  resource
);
