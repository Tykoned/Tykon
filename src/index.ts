import { Project } from "ts-morph";

const project = new Project()

function config(files: string) {
    project.addSourceFilesAtPaths(files);
    return project;
}