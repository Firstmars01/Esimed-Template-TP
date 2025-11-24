import  * as THREE from 'three';


export class Selection {
    constructor(editor) {
        // Keep a reference to the editor so Selection can read/write state and access scene/camera/renderer/ui
        this.editor = editor;
        this.scene = editor.scene;
        this.camera = editor.camera;
        this.renderer = editor.renderer;
        this.raycaster = editor.raycaster;
        this.mouse = editor.mouse;
        this.ui = editor.ui;

        // Local helper (not stored on editor)
        this._groundPlane = null;
    }

    deleteSelectedObject() {
        const selectedObject = this.editor.selectedObject;
        if (!selectedObject) return;
        selectedObject.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else if (child.material) child.material.dispose();
            }
        });
        this.scene.scene.remove(selectedObject);
        this.clearSelection();
        console.log('Objet supprimé');
    }

    clearSelection() {
        if (this.editor.selectedMesh && this.editor.selectedMeshMaterial) {
            this.editor.selectedMesh.material = this.editor.selectedMeshMaterial;
        }
        this.editor.selectedObject = null;
        this.editor.selectedMesh = null;
        this.editor.selectedMeshMaterial = null;
        if (this.ui) this.ui.updateSelection(null);
    }

    onClick(event) {
        // Quand on sélectionne un nouvel objet → reset des modes actifs
        this.editor.moveSelectedObject = false;

        if (!this.raycaster || !this.camera) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
        if (!intersects.length) return this.clearSelection();

        const hit = intersects.find(i => i.object.userData?.isSelectable) || null;
        if (!hit) return this.clearSelection(); // si rien de sélectionnable, clear
        const mesh = hit.object;

        let top = mesh;
        // remonter jusqu'au parent direct sous la scène
        while (top.parent && top.parent !== this.scene.scene) top = top.parent;

        // Vérifier si l'objet (ou le mesh) est un start/finish et verrouiller la rotation sur l'objet racine (top)
        const nameLower = (top.name || mesh.name || '').toLowerCase();
        const isProtected = nameLower.includes('star') || nameLower.includes('finish');
        top.userData = top.userData || {};
        top.userData.lockRotation = isProtected; // verrouille la rotation pour start/finish

        // Restaurer ancien matériau
        if (this.editor.selectedMesh && this.editor.selectedMeshMaterial) this.editor.selectedMesh.material = this.editor.selectedMeshMaterial;

        // Cloner matériau
        const origMat = mesh.material;
        this.editor.selectedMeshMaterial = Array.isArray(origMat)
            ? origMat.map(m => (m?.clone ? m.clone() : m))
            : (origMat?.clone ? origMat.clone() : origMat);

        this.editor.selectedMesh = mesh;
        this.editor.selectedObject = top;

        // Remplacer par matériau rouge
        mesh.material = Array.isArray(this.editor.selectedMeshMaterial)
            ? this.editor.selectedMeshMaterial.map(() => new THREE.MeshBasicMaterial({ color: 0xff0000 }))
            : new THREE.MeshBasicMaterial({ color: 0xff0000 });

        if (this.ui) {
            this.ui.updateSelection({
                name: top.name || 'Inconnu',
                posX: top.position.x, posY: top.position.y, posZ: top.position.z,
                rotX: top.rotation.x, rotY: top.rotation.y, rotZ: top.rotation.z,
                scaleX: top.scale.x, scaleY: top.scale.y, scaleZ: top.scale.z
            });
        }
    }

    onMouseMove(event) {
        const selectedObject = this.editor.selectedObject;
        if (!selectedObject) return;

        if (this.editor.dragMode && this.editor.dragObject) {
            if (!this._groundPlane) this._groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
            const point = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this._groundPlane, point)) {
                if (this.editor.dragYOffset === null) this.editor.dragYOffset = this.editor.dragObject.position.y - point.y;
                this.editor.dragObject.position.set(point.x, point.y + this.editor.dragYOffset, point.z);

                // Mettre à jour l'UI si besoin
                if (this.ui) {
                    this.ui.updateSelection({
                        name: this.editor.dragObject.name || 'Inconnu',
                        posX: this.editor.dragObject.position.x,
                        posY: this.editor.dragObject.position.y,
                        posZ: this.editor.dragObject.position.z,
                        rotX: this.editor.dragObject.rotation.x,
                        rotY: this.editor.dragObject.rotation.y,
                        rotZ: this.editor.dragObject.rotation.z,
                        scaleX: this.editor.dragObject.scale.x,
                        scaleY: this.editor.dragObject.scale.y,
                        scaleZ: this.editor.dragObject.scale.z
                    });
                }
            }
        }

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (!this._groundPlane) this._groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
        const point = new THREE.Vector3();
        if (!this.raycaster.ray.intersectPlane(this._groundPlane, point)) return;

        // Déplacement
        if (this.editor.moveSelectedObject) {
            if (this.editor.dragYOffset === null) this.editor.dragYOffset = selectedObject.position.y - point.y;
            selectedObject.position.set(point.x, point.y + this.editor.dragYOffset, point.z);
        }

        // Rotation
        if (this.editor.rotateSelectedObject) {
            // Ne modifier la rotation QUE si l'objet n'est pas verrouillé
            if (!selectedObject.userData?.lockRotation) {
                const deltaX = event.movementX || 0;
                selectedObject.rotation.y = this.editor.startYRotation + deltaX * 0.01;
            }
        }

        // Scale
        if (this.editor.scaleSelectedObject) {
            const deltaY = event.movementY || 0;
            const factor = 1 + deltaY * 0.01;
            selectedObject.scale.set(
                this.editor.startScale.x * factor,
                this.editor.startScale.y * factor,
                this.editor.startScale.z * factor
            );
        }

        if (this.ui) {
            this.ui.updateSelection({
                name: selectedObject.name || 'Inconnu',
                posX: selectedObject.position.x,
                posY: selectedObject.position.y,
                posZ: selectedObject.position.z,
                rotX: selectedObject.rotation.x,
                rotY: selectedObject.rotation.y,
                rotZ: selectedObject.rotation.z,
                scaleX: selectedObject.scale.x,
                scaleY: selectedObject.scale.y,
                scaleZ: selectedObject.scale.z
            });
        }
    }
}