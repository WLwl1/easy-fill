export const isMutationOwnedBy = (mutation: MutationRecord, root: Node | null) => {
  if (!root) {
    return false
  }

  if (mutation.target === root || root.contains(mutation.target)) {
    return true
  }

  const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes]
  return (
    changedNodes.length > 0 &&
    changedNodes.every((node) => node === root || root.contains(node))
  )
}
