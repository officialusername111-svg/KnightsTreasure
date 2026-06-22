export function createSceneManager(root) {
  return {
    mount(sceneEl) {
      root.replaceChildren(sceneEl);
    },
  };
}
